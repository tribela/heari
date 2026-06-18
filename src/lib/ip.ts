export interface CIDR {
  network: string;
  bits: number;
  family: 4 | 6;
}

export const DEFAULT_TRUSTED_CIDRS: CIDR[] = [
  { network: '10.0.0.0', bits: 8, family: 4 },
  { network: '172.16.0.0', bits: 12, family: 4 },
  { network: '192.168.0.0', bits: 16, family: 4 },
  { network: '127.0.0.0', bits: 8, family: 4 },
  { network: '100.64.0.0', bits: 10, family: 4 },
  { network: 'fc00:0000:0000:0000:0000:0000:0000:0000', bits: 7, family: 6 },
  { network: 'fe80:0000:0000:0000:0000:0000:0000:0000', bits: 10, family: 6 },
  { network: '0000:0000:0000:0000:0000:0000:0000:0001', bits: 128, family: 6 },
];

function expandIPv6(addr: string): string | null {
  let a = addr.split('%')[0];

  const v4mapped = a.match(/^::(ffff:)?(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4mapped) {
    const octets = v4mapped[2].split('.').map(Number);
    const hi = (octets[0] << 8) | octets[1];
    const lo = (octets[2] << 8) | octets[3];
    const p = v4mapped[1] ? 'ffff' : '0000';
    return `0000:0000:0000:0000:0000:${p}:${hi.toString(16).padStart(4, '0')}:${lo.toString(16).padStart(4, '0')}`;
  }

  if (!a.includes('::')) {
    const parts = a.split(':');
    if (parts.length !== 8) return null;
    return parts.map(h => h.padStart(4, '0')).join(':');
  }

  const parts = a.split('::');
  const left = parts[0] ? parts[0].split(':') : [];
  const right = parts[1] ? parts[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0) return null;
  const all = [...left, ...Array(missing).fill('0'), ...right];
  return all.map(h => h.padStart(4, '0')).join(':');
}

function stripLeadingZeros(h: string): string {
  const s = h.replace(/^0+/, '');
  return s || '0';
}

function getIPv6Prefix48(addr: string): string | null {
  let a = addr.split('%')[0];

  if (a.includes('::')) {
    const parts = a.split('::');
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    if (missing < 0) return null;
    const all = [...left, ...Array(missing).fill('0'), ...right];
    return `${stripLeadingZeros(all[0])}:${stripLeadingZeros(all[1])}:${stripLeadingZeros(all[2])}::/48`;
  }

  const parts = a.split(':');
  if (parts.length < 3) return null;
  return `${stripLeadingZeros(parts[0])}:${stripLeadingZeros(parts[1])}:${stripLeadingZeros(parts[2])}::/48`;
}

export function normalizeIP(ip: string): string {
  const t = ip.trim();

  const v4m = t.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4m) return v4m[1];

  if (/^\d+\.\d+\.\d+\.\d+$/.test(t)) return t;

  if (t.includes(':')) {
    const p = getIPv6Prefix48(t);
    if (p) return p;
  }
  return t;
}

export function parseCIDR(s: string): CIDR | null {
  const c = s.trim();
  const wp = c.match(/^([^/]+)\/(\d+)$/);
  if (wp) {
    const [, addr, bitsStr] = wp;
    const bits = parseInt(bitsStr, 10);
    if (addr.includes(':')) {
      const e = expandIPv6(addr);
      return e ? { network: e, bits, family: 6 } : null;
    }
    if (addr.includes('.')) return { network: addr, bits, family: 4 };
    return null;
  }
  if (c.includes(':')) {
    const e = expandIPv6(c);
    return e ? { network: e, bits: 128, family: 6 } : null;
  }
  if (c.includes('.')) return { network: c, bits: 32, family: 4 };
  return null;
}

function ipv4ToNum(ip: string): number | null {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(x => isNaN(x) || x < 0 || x > 255)) return null;
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}

export function matchCIDR(ip: string, cidr: CIDR): boolean {
  if (cidr.family === 4) {
    const ipN = ipv4ToNum(ip);
    if (ipN === null) return false;
    const cN = ipv4ToNum(cidr.network);
    if (cN === null) return false;
    if (cidr.bits === 0) return true;
    const mask = (~(2 ** (32 - cidr.bits) - 1)) >>> 0;
    return (ipN & mask) === (cN & mask);
  }

  const ipH = expandIPv6(ip);
  if (!ipH) return false;
  const ipC = ipH.replace(/:/g, '');
  const cC = cidr.network.replace(/:/g, '');
  if (ipC.length !== 32 || cC.length !== 32) return false;

  for (let i = 0; i < cidr.bits; i++) {
    const bi = Math.floor(i / 4);
    const si = 3 - (i % 4);
    const b1 = (parseInt(ipC[bi], 16) >> si) & 1;
    const b2 = (parseInt(cC[bi], 16) >> si) & 1;
    if (b1 !== b2) return false;
  }
  return true;
}

export function getClientIP(xff: string, trustedCIDRs: CIDR[]): string {
  const ips = xff.split(',').map(s => s.trim()).filter(Boolean);
  if (ips.length === 0) return 'unknown';
  if (trustedCIDRs.length === 0) return normalizeIP(ips[0]);

  let i = ips.length - 1;
  while (i >= 0 && trustedCIDRs.some(c => matchCIDR(ips[i], c))) i--;

  return normalizeIP(i >= 0 ? ips[i] : ips[0]);
}

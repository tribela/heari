import { normalizeIP, parseCIDR, matchCIDR, getClientIP, DEFAULT_TRUSTED_CIDRS } from '../src/lib/ip';

type Case = { fn: string; args: any[]; want: any; desc: string };

const cases: Case[] = [
  // normalizeIP
  { fn: 'normalizeIP', args: ['192.168.1.1'], want: '192.168.1.1', desc: 'IPv4 as-is' },
  { fn: 'normalizeIP', args: ['::ffff:192.0.2.1'], want: '192.0.2.1', desc: 'IPv4-mapped → IPv4' },
  { fn: 'normalizeIP', args: ['2001:db8:abcd:ef01::1'], want: '2001:db8:abcd::/48', desc: 'IPv6 /48 prefix' },
  { fn: 'normalizeIP', args: ['2001:db8:abcd:ffff::1'], want: '2001:db8:abcd::/48', desc: 'IPv6 same /48' },
  { fn: 'normalizeIP', args: ['::1'], want: '0:0:0::/48', desc: 'IPv6 loopback /48' },
  { fn: 'normalizeIP', args: ['2001:db8::1'], want: '2001:db8:0::/48', desc: 'IPv6 short form /48' },

  // parseCIDR
  { fn: 'parseCIDR', args: ['10.0.0.0/8'], want: { network: '10.0.0.0', bits: 8, family: 4 }, desc: 'IPv4 CIDR /8' },
  { fn: 'parseCIDR', args: ['192.168.1.1'], want: { network: '192.168.1.1', bits: 32, family: 4 }, desc: 'IPv4 single IP = /32' },
  { fn: 'parseCIDR', args: ['2001:db8::/32'], want: { network: '2001:0db8:0000:0000:0000:0000:0000:0000', bits: 32, family: 6 }, desc: 'IPv6 CIDR /32' },
  { fn: 'parseCIDR', args: ['::1'], want: { network: '0000:0000:0000:0000:0000:0000:0000:0001', bits: 128, family: 6 }, desc: 'IPv6 loopback /128' },

  // matchCIDR
  { fn: 'matchCIDR', args: ['10.0.0.5', { network: '10.0.0.0', bits: 8, family: 4 }], want: true, desc: 'IPv4 10.x matches 10.0.0.0/8' },
  { fn: 'matchCIDR', args: ['11.0.0.5', { network: '10.0.0.0', bits: 8, family: 4 }], want: false, desc: 'IPv4 11.x does not match 10.0.0.0/8' },
  { fn: 'matchCIDR', args: ['192.168.1.1', { network: '192.168.0.0', bits: 16, family: 4 }], want: true, desc: 'IPv4 192.168.x matches /16' },
  { fn: 'matchCIDR', args: ['192.167.255.255', { network: '192.168.0.0', bits: 16, family: 4 }], want: false, desc: 'IPv4 192.167.x does not match 192.168.0.0/16' },
  { fn: 'matchCIDR', args: ['203.0.113.50', { network: '203.0.113.50', bits: 32, family: 4 }], want: true, desc: 'IPv4 exact match /32' },
  { fn: 'matchCIDR', args: ['203.0.113.51', { network: '203.0.113.50', bits: 32, family: 4 }], want: false, desc: 'IPv4 exact mismatch /32' },
  { fn: 'matchCIDR', args: ['2001:db8:abcd::1', { network: '2001:0db8:0000:0000:0000:0000:0000:0000', bits: 32, family: 6 }], want: true, desc: 'IPv6 2001:db8::/32 match' },
  { fn: 'matchCIDR', args: ['2001:db9::1', { network: '2001:0db8:0000:0000:0000:0000:0000:0000', bits: 32, family: 6 }], want: false, desc: 'IPv6 2001:db9::/32 no match' },
  { fn: 'matchCIDR', args: ['::1', { network: '0000:0000:0000:0000:0000:0000:0000:0001', bits: 128, family: 6 }], want: true, desc: 'IPv6 ::1 exact match' },

  // getClientIP — no trusted proxies
  { fn: 'getClientIP', args: ['192.168.1.1', []], want: '192.168.1.1', desc: 'no trusted, single IP' },
  { fn: 'getClientIP', args: ['203.0.113.5, 10.0.0.1', []], want: '203.0.113.5', desc: 'no trusted, leftmost' },

  // getClientIP — with trusted proxies (right-to-left strip)
  { fn: 'getClientIP', args: ['203.0.113.5, 10.0.0.1', [DEFAULT_TRUSTED_CIDRS[0]]], want: '203.0.113.5', desc: 'trusted=10/8, strip 10.0.0.1 from right, client=203.0.113.5' },
  { fn: 'getClientIP', args: ['203.0.113.5, 172.17.0.1, 10.0.0.1', DEFAULT_TRUSTED_CIDRS], want: '203.0.113.5', desc: 'trusted private ranges, strip 10.0.0.1+172.17.0.1, client=203.0.113.5' },
];

let failed = 0;
for (const c of cases) {
  let ok: boolean;
  let got: any;
  try {
    if (c.fn === 'normalizeIP') got = (normalizeIP as any)(...c.args);
    else if (c.fn === 'parseCIDR') got = (parseCIDR as any)(...c.args);
    else if (c.fn === 'matchCIDR') got = (matchCIDR as any)(...c.args);
    else if (c.fn === 'getClientIP') got = (getClientIP as any)(...c.args);
    ok = JSON.stringify(got) === JSON.stringify(c.want);
  } catch (e: any) {
    ok = false;
    got = `ERROR: ${e.message}`;
  }
  const mark = ok ? '✓' : '✗';
  console.log(`${mark} ${c.desc}: ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(c.want)})`}`);
  if (!ok) failed++;
}

console.log(`\n${failed ? `FAILED ${failed}/${cases.length}` : `PASS ${cases.length}/${cases.length}`}`);
process.exit(failed ? 1 : 0);

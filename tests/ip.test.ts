import { describe, it, expect } from 'bun:test';
import { normalizeIP, parseCIDR, matchCIDR, getClientIP, DEFAULT_TRUSTED_CIDRS } from '../src/lib/ip';

describe('normalizeIP', () => {
  it('IPv4 as-is', () => expect(normalizeIP('192.168.1.1')).toBe('192.168.1.1'));
  it('IPv4-mapped → IPv4', () => expect(normalizeIP('::ffff:192.0.2.1')).toBe('192.0.2.1'));
  it('IPv6 /48 prefix', () => expect(normalizeIP('2001:db8:abcd:ef01::1')).toBe('2001:db8:abcd::/48'));
  it('IPv6 same /48', () => expect(normalizeIP('2001:db8:abcd:ffff::1')).toBe('2001:db8:abcd::/48'));
  it('IPv6 loopback /48', () => expect(normalizeIP('::1')).toBe('0:0:0::/48'));
  it('IPv6 short form /48', () => expect(normalizeIP('2001:db8::1')).toBe('2001:db8:0::/48'));
});

describe('parseCIDR', () => {
  it('IPv4 CIDR /8', () => expect(parseCIDR('10.0.0.0/8')).toEqual({ network: '10.0.0.0', bits: 8, family: 4 }));
  it('IPv4 single IP = /32', () => expect(parseCIDR('192.168.1.1')).toEqual({ network: '192.168.1.1', bits: 32, family: 4 }));
  it('IPv6 CIDR /32', () => expect(parseCIDR('2001:db8::/32')).toEqual({
    network: '2001:0db8:0000:0000:0000:0000:0000:0000', bits: 32, family: 6,
  }));
  it('IPv6 loopback /128', () => expect(parseCIDR('::1')).toEqual({
    network: '0000:0000:0000:0000:0000:0000:0000:0001', bits: 128, family: 6,
  }));
});

describe('matchCIDR', () => {
  it('IPv4 10.x matches 10.0.0.0/8', () => expect(matchCIDR('10.0.0.5', { network: '10.0.0.0', bits: 8, family: 4 })).toBe(true));
  it('IPv4 11.x does not match 10.0.0.0/8', () => expect(matchCIDR('11.0.0.5', { network: '10.0.0.0', bits: 8, family: 4 })).toBe(false));
  it('IPv4 192.168.x matches /16', () => expect(matchCIDR('192.168.1.1', { network: '192.168.0.0', bits: 16, family: 4 })).toBe(true));
  it('IPv4 192.167.x does not match /16', () => expect(matchCIDR('192.167.255.255', { network: '192.168.0.0', bits: 16, family: 4 })).toBe(false));
  it('IPv4 exact match /32', () => expect(matchCIDR('203.0.113.50', { network: '203.0.113.50', bits: 32, family: 4 })).toBe(true));
  it('IPv4 exact mismatch /32', () => expect(matchCIDR('203.0.113.51', { network: '203.0.113.50', bits: 32, family: 4 })).toBe(false));
  it('IPv6 2001:db8::/32 match', () => expect(matchCIDR('2001:db8:abcd::1', { network: '2001:0db8:0000:0000:0000:0000:0000:0000', bits: 32, family: 6 })).toBe(true));
  it('IPv6 2001:db9::/32 no match', () => expect(matchCIDR('2001:db9::1', { network: '2001:0db8:0000:0000:0000:0000:0000:0000', bits: 32, family: 6 })).toBe(false));
  it('IPv6 ::1 exact match', () => expect(matchCIDR('::1', { network: '0000:0000:0000:0000:0000:0000:0000:0001', bits: 128, family: 6 })).toBe(true));
});

describe('getClientIP', () => {
  it('no trusted, single IP', () => expect(getClientIP('192.168.1.1', [])).toBe('192.168.1.1'));
  it('no trusted, leftmost', () => expect(getClientIP('203.0.113.5, 10.0.0.1', [])).toBe('203.0.113.5'));
  it('trusted=10/8, strip 10.0.0.1, client=203.0.113.5', () =>
    expect(getClientIP('203.0.113.5, 10.0.0.1', [DEFAULT_TRUSTED_CIDRS[0]])).toBe('203.0.113.5'));
  it('trusted private ranges, strip chain, client=203.0.113.5', () =>
    expect(getClientIP('203.0.113.5, 172.17.0.1, 10.0.0.1', DEFAULT_TRUSTED_CIDRS)).toBe('203.0.113.5'));
});

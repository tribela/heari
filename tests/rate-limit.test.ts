import { describe, it, expect } from 'bun:test';
import { rateLimit } from '../src/lib/rate-limit';

const windowMs = 60000;
const max = 3;

describe('rateLimit', () => {
  it('first request allowed', () => {
    const r = rateLimit('rl-test-1', { max, windowMs });
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(max - 1);
    expect(r.retryAfter).toBe(0);
    expect(r.resetAt).toBeGreaterThan(Date.now());
  });

  it('second request allowed, remaining decremented', () => {
    rateLimit('rl-test-2', { max, windowMs }); // consume 1
    const r = rateLimit('rl-test-2', { max, windowMs });
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(max - 2);
  });

  it('third request at limit (remaining=0)', () => {
    rateLimit('rl-test-3', { max, windowMs });
    rateLimit('rl-test-3', { max, windowMs });
    const r = rateLimit('rl-test-3', { max, windowMs });
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(0);
  });

  it('fourth request blocked', () => {
    rateLimit('rl-test-4', { max, windowMs });
    rateLimit('rl-test-4', { max, windowMs });
    rateLimit('rl-test-4', { max, windowMs });
    const r = rateLimit('rl-test-4', { max, windowMs });
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.retryAfter).toBeGreaterThan(0);
  });

  it('different key not affected', () => {
    const r = rateLimit('rl-test-diff', { max, windowMs });
    expect(r.allowed).toBe(true);
  });

  it('window reset after expiry', async () => {
    const shortWindow = 50;
    const key = 'rl-test-window';

    expect(rateLimit(key, { max: 1, windowMs: shortWindow }).allowed).toBe(true);
    expect(rateLimit(key, { max: 1, windowMs: shortWindow }).allowed).toBe(false);

    await new Promise(r => setTimeout(r, shortWindow + 10));

    expect(rateLimit(key, { max: 1, windowMs: shortWindow }).allowed).toBe(true);
  }, { timeout: 200 });
});

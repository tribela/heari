import { rateLimit } from '../src/lib/rate-limit';

const windowMs = 60000;
const max = 3;

let failed = 0;

function test(desc: string, fn: () => boolean) {
  const ok = fn();
  console.log(`${ok ? '✓' : '✗'} ${desc}`);
  if (!ok) failed++;
}

// First request — allowed
const r1 = rateLimit('test-key-1', { max, windowMs });
test('first request allowed', () => r1.allowed === true);
test('remaining = max-1', () => r1.remaining === max - 1);
test('retryAfter = 0', () => r1.retryAfter === 0);
test('resetAt in future', () => r1.resetAt > Date.now());

// Second request — still allowed
const r2 = rateLimit('test-key-1', { max, windowMs });
test('second request allowed', () => r2.allowed === true);
test('remaining decremented', () => r2.remaining === max - 2);

// Third request — allowed (at limit)
const r3 = rateLimit('test-key-1', { max, windowMs });
test('third request allowed (at limit)', () => r3.allowed === true);
test('remaining = 0', () => r3.remaining === 0);

// Fourth request — blocked
const r4 = rateLimit('test-key-1', { max, windowMs });
test('fourth request blocked', () => r4.allowed === false);
test('remaining = 0 on block', () => r4.remaining === 0);
test('retryAfter > 0 on block', () => r4.retryAfter > 0);
test('resetAt still future', () => r4.resetAt > Date.now());

// Different key — not affected
const rDiff = rateLimit('test-key-different', { max, windowMs });
test('different key not affected', () => rDiff.allowed === true);

// Short window — reset test
const shortWindow = 50; // 50ms
const r5 = rateLimit('test-key-2', { max: 1, windowMs: shortWindow });
test('short window: first allowed', () => r5.allowed === true);

const r6 = rateLimit('test-key-2', { max: 1, windowMs: shortWindow });
test('short window: second blocked (same window)', () => r6.allowed === false);

// Wait for window to expire, then should be allowed again
await new Promise(resolve => setTimeout(resolve, shortWindow + 10));

const r7 = rateLimit('test-key-2', { max: 1, windowMs: shortWindow });
test('short window: allowed after reset', () => r7.allowed === true);

console.log(`\n${failed ? `FAILED ${failed} tests` : `PASS all tests`}`);
process.exit(failed ? 1 : 0);

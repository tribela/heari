export interface RateLimitConfig {
  max: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  resetAt: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();
let cleanupCounter = 0;

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();

  cleanupCounter++;
  if (cleanupCounter >= 100) {
    cleanupCounter = 0;
    for (const [k, e] of store) {
      if (e.resetAt <= now) store.delete(k);
    }
  }

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.max - 1,
      retryAfter: 0,
      resetAt: now + config.windowMs,
    };
  }

  entry.count++;

  if (entry.count > config.max) {
    const retryAfter = entry.resetAt - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
      resetAt: entry.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: config.max - entry.count,
    retryAfter: 0,
    resetAt: entry.resetAt,
  };
}

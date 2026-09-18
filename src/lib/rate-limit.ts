/**
 * Ultra-fast, zero-dependency in-memory rate limiter.
 * Operates in microseconds with automatic cache eviction to ensure zero app latency.
 */

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Evict expired records every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.expiresAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000 // 15 minutes default
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.expiresAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      retryAfterSeconds: 0,
    };
  }

  if (entry.count >= maxAttempts) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: maxAttempts - entry.count,
    retryAfterSeconds: 0,
  };
}

export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

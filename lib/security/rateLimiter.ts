/**
 * In-memory sliding-window rate limiter for authoritative API endpoints.
 * Provides protection against spam, brute-force, and DoS without external infrastructure dependencies.
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitBucket>();

// Clean up stale entries every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of rateLimitMap.entries()) {
      if (bucket.resetAt < now) {
        rateLimitMap.delete(key);
      }
    }
  }, 60000);
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

/**
 * Checks and increments the rate limit counter for a given identifier (actorId or IP).
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 30, windowMs: 10000 }
): RateLimitResult {
  const now = Date.now();
  const bucket = rateLimitMap.get(identifier);

  if (!bucket || bucket.resetAt < now) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      allowed: true,
      remaining: options.limit - 1,
      resetInMs: options.windowMs,
    };
  }

  if (bucket.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, bucket.resetAt - now),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: options.limit - bucket.count,
    resetInMs: Math.max(0, bucket.resetAt - now),
  };
}

/**
 * Clears rate limit state (useful in tests).
 */
export function resetRateLimits(): void {
  rateLimitMap.clear();
}

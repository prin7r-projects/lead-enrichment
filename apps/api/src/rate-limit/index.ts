/**
 * Token-bucket rate limiter — per API key, per tier.
 *
 * In-memory implementation suitable for single-instance deployments.
 * For multi-instance, this would be backed by Redis.
 */

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface TierConfig {
  burst: number;
  refillPerSecond: number;
}

const DEFAULT_TIERS: Record<string, TierConfig> = {
  starter: { burst: 50, refillPerSecond: 1 },
  team: { burst: 250, refillPerSecond: 5 },
  scale: { burst: 1000, refillPerSecond: 20 }
};

const buckets = new Map<string, TokenBucket>();

/** Clean up stale buckets every 5 minutes. */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > 3600_000) {
      buckets.delete(key);
    }
  }
}, 300_000).unref();

/**
 * Check if a request should be allowed. Returns { allowed, retryAfterMs }.
 */
export function checkRateLimit(
  keyHash: string,
  tier: string
): { allowed: boolean; retryAfterMs: number } {
  const config = DEFAULT_TIERS[tier] ?? DEFAULT_TIERS.starter;
  const now = Date.now();

  let bucket = buckets.get(keyHash);
  if (!bucket) {
    bucket = { tokens: config.burst, lastRefill: now };
    buckets.set(keyHash, bucket);
  }

  // Refill tokens based on time elapsed
  const elapsed = (now - bucket.lastRefill) / 1000;
  const refill = elapsed * config.refillPerSecond;
  bucket.tokens = Math.min(config.burst, bucket.tokens + refill);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  // Calculate how long until next token is available
  const retryAfterMs = Math.ceil((1 / config.refillPerSecond) * 1000);
  return { allowed: false, retryAfterMs };
}

/**
 * Get the tier configuration for testing/inspection.
 */
export function getTierConfig(tier: string): TierConfig {
  return DEFAULT_TIERS[tier] ?? DEFAULT_TIERS.starter;
}

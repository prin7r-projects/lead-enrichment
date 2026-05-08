/**
 * Simple in-memory cache for enrichment results.
 *
 * Stores enriched response objects keyed by sha256(domain + name).
 * Each slice has its own TTL per doc/12 §3.3 and doc/02.
 *
 * For multi-instance deployments, this would be backed by Redis.
 */

interface CacheEntry {
  data: Record<string, unknown>;
  storedAt: number;
}

/** Default cache map. In production this would be Redis. */
const cache = new Map<string, Record<string, CacheEntry>>();

const SLICE_TTLS: Record<string, number> = {
  firmographic: 28 * 86_400_000,   // 28 days
  decisionMaker: 14 * 86_400_000,  // 14 days
  technographic: 7 * 86_400_000,   // 7 days
  intent: 24 * 3600_000            // 24 hours
};

/** Clean up expired entries every hour. */
setInterval(() => {
  const now = Date.now();
  for (const [compositeKey, slices] of cache) {
    let allExpired = true;
    for (const [slice, entry] of Object.entries(slices)) {
      const ttl = SLICE_TTLS[slice] ?? SLICE_TTLS.firmographic;
      if (now - entry.storedAt > ttl) {
        delete slices[slice];
      } else {
        allExpired = false;
      }
    }
    if (allExpired || Object.keys(slices).length === 0) {
      cache.delete(compositeKey);
    }
  }
}, 3600_000).unref();

/**
 * Build a cache key from input parameters.
 * The key is sha256(domain + name) — per doc/11 S11.
 */
export function buildCacheKey(input: {
  email?: string;
  domain?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
}): string {
  const parts: string[] = [];

  if (input.email) {
    const at = input.email.indexOf("@");
    if (at > 0) {
      parts.push(input.email.slice(at + 1).toLowerCase().trim());
      parts.push(input.email.slice(0, at).toLowerCase().trim());
    }
  }
  if (input.domain) parts.push(input.domain.toLowerCase().trim());
  if (input.firstName) parts.push(input.firstName.toLowerCase().trim());
  if (input.lastName) parts.push(input.lastName.toLowerCase().trim());

  return parts.join("|");
}

/**
 * Get a cached enrichment response by slice.
 * Returns the data for all available slices, or null if the key is not cached.
 */
export function getCached(key: string): { data: Record<string, unknown>; ageMs: number } | null {
  const slices = cache.get(key);
  if (!slices) return null;

  const now = Date.now();
  let anyValid = false;
  const result: Record<string, unknown> = {};

  for (const [slice, entry] of Object.entries(slices)) {
    const ttl = SLICE_TTLS[slice] ?? SLICE_TTLS.firmographic;
    if (now - entry.storedAt <= ttl) {
      Object.assign(result, entry.data);
      anyValid = true;
    } else {
      delete slices[slice];
    }
  }

  if (!anyValid || Object.keys(result).length === 0) {
    cache.delete(key);
    return null;
  }

  // Compute max age across slices for the ageMs field
  const ages = Object.values(slices)
    .filter(e => now - e.storedAt <= (SLICE_TTLS.firmographic))
    .map(e => now - e.storedAt);
  const maxAge = ages.length > 0 ? Math.max(...ages) : 0;

  return { data: result, ageMs: maxAge };
}

/**
 * Store an enrichment response in the cache, indexed by slice type.
 */
export function setCached(
  key: string,
  sliceData: Record<string, Record<string, unknown>>
): void {
  const storedAt = Date.now();
  const slices: Record<string, CacheEntry> = {};

  for (const [slice, data] of Object.entries(sliceData)) {
    slices[slice] = { data, storedAt };
  }

  cache.set(key, slices);
}

/**
 * Get cache stats for monitoring.
 */
export function getCacheStats(): { size: number; maxSize?: number } {
  let totalEntries = 0;
  for (const slices of cache.values()) {
    totalEntries += Object.keys(slices).length;
  }
  return { size: totalEntries };
}

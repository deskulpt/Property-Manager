/** Light in-process rate limit for listing import (demo-safe). */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20

export function checkImportRateLimit(key: string): {
  ok: boolean
  remaining: number
  retryAfterSec: number
} {
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS }
    buckets.set(key, bucket)
  }
  if (bucket.count >= MAX_PER_WINDOW) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }
  bucket.count += 1
  return {
    ok: true,
    remaining: MAX_PER_WINDOW - bucket.count,
    retryAfterSec: 0,
  }
}

/** Test helper */
export function resetImportRateLimits() {
  buckets.clear()
}

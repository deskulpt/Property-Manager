import "server-only"

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** Simple in-process rate limiter. Adequate for single-node Railway; replace with Redis for multi-instance. */
export function rateLimit(input: {
  key: string
  limit: number
  windowMs: number
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  const existing = buckets.get(input.key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + input.windowMs })
    return { ok: true }
  }
  if (existing.count >= input.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) }
  }
  existing.count += 1
  return { ok: true }
}

/** Test helper */
export function clearRateLimits() {
  buckets.clear()
}

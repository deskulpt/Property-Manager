import "server-only"
import { getDb } from "@/lib/db"

/**
 * DB-backed rate limiter (survives process restart; shared across Railway replicas
 * on the same SQLite volume). Window is sliding from first hit in the bucket.
 */
export function rateLimit(input: {
  key: string
  limit: number
  windowMs: number
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const db = getDb()
  const now = Date.now()
  const row = db
    .prepare("SELECT hit_count, reset_at FROM rate_limit_buckets WHERE bucket_key = ?")
    .get(input.key) as { hit_count: number; reset_at: number } | undefined

  if (!row || row.reset_at <= now) {
    db.prepare(
      `INSERT INTO rate_limit_buckets (bucket_key, hit_count, reset_at)
       VALUES (?, 1, ?)
       ON CONFLICT(bucket_key) DO UPDATE SET hit_count = 1, reset_at = excluded.reset_at`,
    ).run(input.key, now + input.windowMs)
    return { ok: true }
  }

  if (row.hit_count >= input.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((row.reset_at - now) / 1000)),
    }
  }

  db.prepare("UPDATE rate_limit_buckets SET hit_count = hit_count + 1 WHERE bucket_key = ?").run(
    input.key,
  )
  return { ok: true }
}

/** Test helper — clears all buckets. */
export function clearRateLimits() {
  try {
    getDb().prepare("DELETE FROM rate_limit_buckets").run()
  } catch {
    /* schema may not exist in unit-only contexts */
  }
}

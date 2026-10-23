import "server-only"
import { createHash, randomInt } from "node:crypto"
import { isE164 } from "@/lib/market"
import { getDb } from "@/lib/db"
import { isProduction } from "@/lib/env"
import { rateLimit } from "@/lib/rate-limit"

const DEMO_OTP_CODE = "246810"

function hashCode(code: string) {
  return createHash("sha256").update(`otp:${code}`).digest("hex")
}

export function demoOtpCode() {
  // Never expose a fixed code in production builds.
  if (isProduction()) return null
  return DEMO_OTP_CODE
}

export function requestDemoOtp(userId: string, phoneE164: string) {
  if (!isE164(phoneE164)) {
    return { ok: false as const, error: "Enter a valid international number with country code." }
  }
  const limited = rateLimit({ key: `otp-req:${userId}`, limit: 5, windowMs: 15 * 60 * 1000 })
  if (!limited.ok) {
    return {
      ok: false as const,
      error: `Too many OTP requests. Try again in ${limited.retryAfterSec}s.`,
    }
  }
  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date()
  const expires = new Date(now.getTime() + 10 * 60 * 1000).toISOString()
  const plain = isProduction() ? String(randomInt(100000, 999999)) : DEMO_OTP_CODE
  db.prepare("DELETE FROM otp_challenges WHERE user_id = ?").run(userId)
  db.prepare(
    `INSERT INTO otp_challenges (id, user_id, phone_e164, code, created_at, expires_at, verified_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
  ).run(id, userId, phoneE164, hashCode(plain), now.toISOString(), expires)
  return {
    ok: true as const,
    phoneE164,
    /** Only returned outside production so the UI can show the demo code. */
    demoCode: isProduction() ? null : plain,
    expiresAt: expires,
  }
}

export function verifyDemoOtp(userId: string, code: string) {
  const limited = rateLimit({ key: `otp-verify:${userId}`, limit: 10, windowMs: 15 * 60 * 1000 })
  if (!limited.ok) {
    return {
      ok: false as const,
      error: `Too many attempts. Try again in ${limited.retryAfterSec}s.`,
    }
  }
  const db = getDb()
  const row = db
    .prepare(
      `SELECT id, phone_e164, code, expires_at FROM otp_challenges
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(userId) as
    | { id: string; phone_e164: string; code: string; expires_at: string }
    | undefined
  if (!row) return { ok: false as const, error: "Request a demo OTP first." }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false as const, error: "That OTP expired. Request a new one." }
  }
  const incoming = hashCode(code.trim())
  // Support legacy plaintext seed rows during transition.
  const match = row.code === incoming || (!isProduction() && code.trim() === row.code)
  if (!match) {
    return { ok: false as const, error: "Incorrect OTP." }
  }
  db.prepare("UPDATE otp_challenges SET verified_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    row.id,
  )
  db.prepare("UPDATE users SET phone = ? WHERE id = ?").run(row.phone_e164, userId)
  return { ok: true as const, phoneE164: row.phone_e164 }
}

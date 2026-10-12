import "server-only"
import { isE164 } from "@/lib/market"
import { getDb } from "@/lib/db"

const DEMO_OTP_CODE = "246810"

export function demoOtpCode() {
  return DEMO_OTP_CODE
}

export function requestDemoOtp(userId: string, phoneE164: string) {
  if (!isE164(phoneE164)) {
    return { ok: false as const, error: "Enter a valid international number with country code." }
  }
  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date()
  const expires = new Date(now.getTime() + 10 * 60 * 1000).toISOString()
  db.prepare("DELETE FROM otp_challenges WHERE user_id = ?").run(userId)
  db.prepare(
    `INSERT INTO otp_challenges (id, user_id, phone_e164, code, created_at, expires_at, verified_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
  ).run(id, userId, phoneE164, DEMO_OTP_CODE, now.toISOString(), expires)
  return {
    ok: true as const,
    phoneE164,
    demoCode: DEMO_OTP_CODE,
    expiresAt: expires,
  }
}

export function verifyDemoOtp(userId: string, code: string) {
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
  if (code.trim() !== row.code) {
    return { ok: false as const, error: "Incorrect OTP. Use the demo code shown on screen." }
  }
  db.prepare("UPDATE otp_challenges SET verified_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    row.id,
  )
  db.prepare("UPDATE users SET phone = ? WHERE id = ?").run(row.phone_e164, userId)
  return { ok: true as const, phoneE164: row.phone_e164 }
}

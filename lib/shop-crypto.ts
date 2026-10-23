import "server-only"
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import { requireSecretKey } from "@/lib/env"

/**
 * Per-tenant Razorpay secrets stay server-side.
 * Key material comes from DESKULPT_SECRET_KEY (required in production).
 */
function keyBytes() {
  return createHash("sha256").update(requireSecretKey()).digest()
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`
}

export function decryptSecret(payload: string): string | null {
  try {
    const [version, ivB64, tagB64, dataB64] = payload.split(":")
    if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) return null
    const decipher = createDecipheriv("aes-256-gcm", keyBytes(), Buffer.from(ivB64, "base64url"))
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"))
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]).toString("utf8")
  } catch {
    return null
  }
}

export function secretLast4(plain: string) {
  const trimmed = plain.trim()
  if (trimmed.length < 4) return "••••"
  return `••••${trimmed.slice(-4)}`
}

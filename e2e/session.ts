import { createHmac } from "node:crypto"

const SECRET = process.env.DESKULPT_SECRET_KEY || "deskulpt-e2e-secret-key-32b"

/** Match server mintSessionValue (lib/session.ts). */
export function mintDemoSessionCookie(userId: string) {
  const sig = createHmac("sha256", SECRET).update(`v1:${userId}`).digest("base64url")
  return `v1.${userId}.${sig}`
}

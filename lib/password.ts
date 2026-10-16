import "server-only"
import bcrypt from "bcryptjs"

const ROUNDS = 10

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false
  return bcrypt.compare(plain, hash)
}

export function passwordPolicyError(plain: string): string | null {
  if (plain.length < 8) return "Use at least 8 characters."
  if (plain.length > 128) return "Password is too long."
  return null
}

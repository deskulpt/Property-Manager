import "server-only"
import type {
  AuthCredentials,
  AuthProvider,
  AuthResult,
  InviteInput,
  InviteResult,
  OrgCreateInput,
} from "@/lib/auth/provider"
import { hashPassword, randomToken, verifyPassword } from "@/lib/auth/password"
import { DEFAULT_PACKAGE, parsePackage } from "@/lib/auth/packages"
import {
  acceptOrgInvite,
  createLandlordOrg,
  createPasswordReset,
  createUserAccount,
  enqueuePasswordResetNotice,
  findUserByEmail,
  getPasswordHash,
  inviteOrgSeat,
  setPasswordHash,
} from "@/lib/db"

export class CredentialsAuthProvider implements AuthProvider {
  readonly kind = "credentials" as const

  async signUp(input: AuthCredentials & { name: string }): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase()
    const name = input.name.trim()
    if (!email || !name) return { ok: false, error: "Name and email are required." }
    if (!input.password || input.password.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters." }
    }
    if (findUserByEmail(email)) {
      return { ok: false, error: "That email already has an account." }
    }
    const passwordHash = hashPassword(input.password)
    const created = createUserAccount({
      name,
      email,
      passwordHash,
      role: "applicant",
    })
    if (!created.ok) return created
    return { ok: true, userId: created.userId }
  }

  async logIn(input: AuthCredentials): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase()
    const user = findUserByEmail(email)
    if (!user) return { ok: false, error: "Email or password is incorrect." }
    const stored = getPasswordHash(user.id)
    if (!stored) {
      return {
        ok: false,
        error: "This demo identity has no password. Use Sign up, or the identity switcher in OSS mode.",
      }
    }
    // Slice A signup uses scrypt; main L0/L1 seed + signupLandlord use bcryptjs.
    let ok = false
    if (stored.startsWith("scrypt$")) {
      ok = verifyPassword(input.password, stored)
    } else if (stored.startsWith("$2a$") || stored.startsWith("$2b$")) {
      const { verifyPassword: verifyBcrypt } = await import("@/lib/password")
      ok = await verifyBcrypt(input.password, stored)
    } else {
      ok = verifyPassword(input.password, stored)
      if (!ok) {
        const { verifyPassword: verifyBcrypt } = await import("@/lib/password")
        ok = await verifyBcrypt(input.password, stored)
      }
    }
    if (!ok) {
      return { ok: false, error: "Email or password is incorrect." }
    }
    return { ok: true, userId: user.id, tenantId: user.tenantId ?? undefined }
  }

  async createOrg(userId: string, input: OrgCreateInput): Promise<AuthResult> {
    const country = input.country.trim()
    if (country.toLowerCase() !== "india" && country.toUpperCase() !== "IN") {
      return {
        ok: false,
        error: "Public signup is India-only until another market clears the checklist.",
      }
    }
    const pkg = parsePackage(input.packageId ?? DEFAULT_PACKAGE)
    const result = createLandlordOrg({
      userId,
      legalName: input.legalName.trim(),
      city: input.city.trim(),
      actingAs: input.actingAs.trim(),
      entityType: input.entityType.trim(),
      contactName: input.contactName.trim(),
      contactEmail: input.contactEmail.trim().toLowerCase(),
      packageId: pkg,
    })
    return result
  }

  async inviteSeat(input: InviteInput): Promise<InviteResult> {
    return inviteOrgSeat(input)
  }

  async acceptInvite(token: string, userId: string): Promise<AuthResult> {
    return acceptOrgInvite(token, userId)
  }

  async requestPasswordReset(email: string) {
    const normalized = email.trim().toLowerCase()
    if (!normalized.includes("@")) return { ok: false as const, error: "Enter a valid email." }
    const user = findUserByEmail(normalized)
    // Always look successful to avoid account enumeration; only enqueue when user exists.
    if (!user) return { ok: true as const, demo: true }
    const token = randomToken(24)
    createPasswordReset(user.id, token)
    enqueuePasswordResetNotice(user.id, token)
    return { ok: true as const, demo: true, token }
  }
}

/** Test helper: set a known password on a seeded user. */
export function setUserPasswordForTests(userId: string, password: string) {
  setPasswordHash(userId, hashPassword(password))
}

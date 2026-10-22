import "server-only"
import { CredentialsAuthProvider } from "@/lib/auth/credentials-provider"
import { demoAuthAllowed, isHosted } from "@/lib/auth/mode"
import type { SeatRole } from "@/lib/auth/seats"
import type { SubscriptionPackage } from "@/lib/auth/packages"

/**
 * AuthProvider — adapters-first (plan §1). Demo path for OSS; credentials for hosted.
 */

export type AuthCredentials = {
  email: string
  password: string
  name?: string
}

export type OrgCreateInput = {
  legalName: string
  city: string
  actingAs: string
  entityType: string
  contactEmail: string
  contactName: string
  country: string
  packageId?: SubscriptionPackage
}

export type InviteInput = {
  tenantId: string
  email: string
  seatRole: SeatRole
  invitedByUserId: string
}

export type AuthResult =
  | { ok: true; userId: string; tenantId?: string }
  | { ok: false; error: string }

export type InviteResult =
  | { ok: true; inviteId: string; token: string }
  | { ok: false; error: string }

export interface AuthProvider {
  readonly kind: "demo" | "credentials"
  signUp(input: AuthCredentials & { name: string }): Promise<AuthResult>
  logIn(input: AuthCredentials): Promise<AuthResult>
  createOrg(userId: string, input: OrgCreateInput): Promise<AuthResult>
  inviteSeat(input: InviteInput): Promise<InviteResult>
  acceptInvite(token: string, userId: string): Promise<AuthResult>
  requestPasswordReset(
    email: string,
  ): Promise<{ ok: true; demo: boolean; token?: string } | { ok: false; error: string }>
}

let cached: AuthProvider | null = null

export function getAuthProvider(): AuthProvider {
  if (cached) return cached
  cached = new CredentialsAuthProvider()
  return cached
}

export function resetAuthProviderCache() {
  cached = null
}

export function shouldShowDemoSwitcher(): boolean {
  return demoAuthAllowed()
}

export function requireCredentialsPath(): boolean {
  return isHosted() && !demoAuthAllowed()
}

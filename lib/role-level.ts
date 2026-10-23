import type { Role } from "@/lib/format"

/**
 * Privilege ladder (lower number = higher privilege).
 * L0 SuperAdmin · L1 Admin (DeSkulpt staff) · L2 Landlord · L3 Property Manager ·
 * L4 Lease Applicant · L5 Service Provider.
 */
export type RoleLevel = 0 | 1 | 2 | 3 | 4 | 5

export const ROLE_LEVEL_LABEL: Record<RoleLevel, string> = {
  0: "L0 SuperAdmin",
  1: "L1 Admin",
  2: "L2 Landlord",
  3: "L3 Property Manager",
  4: "L4 Lease Applicant",
  5: "L5 Service Provider",
}

/** Default level when a row has no stored role_level. */
export function roleToLevel(role: Role | string): RoleLevel {
  switch (role) {
    case "super_admin":
      return 0
    case "account_manager":
    case "service_manager":
    case "property_manager":
    case "merchandiser":
      return 1
    case "landlord_admin":
      return 2
    case "managing_agent":
      return 3
    case "applicant":
      return 4
    case "service_provider":
      return 5
    case "pending":
      return 5
    default:
      return 5
  }
}

export function normalizeRoleLevel(value: unknown, fallbackRole?: Role | string): RoleLevel {
  if (value == null || value === "") {
    return fallbackRole ? roleToLevel(fallbackRole) : 5
  }
  const n = typeof value === "number" ? value : Number(value)
  if (Number.isInteger(n) && n >= 0 && n <= 5) return n as RoleLevel
  return fallbackRole ? roleToLevel(fallbackRole) : 5
}

/** Platform console + sticky impersonation — L0 SuperAdmin and L1 Admin only. */
export function canOpenConsole(level: RoleLevel) {
  return level <= 1
}

export function canImpersonate(level: RoleLevel) {
  return level <= 1
}

/** Self-serve onboarding may only pick L2–L5. */
export const ONBOARDING_ROLE_LEVELS: RoleLevel[] = [2, 3, 4, 5]

export function roleForOnboardingLevel(level: RoleLevel): Role | null {
  switch (level) {
    case 2:
      return "landlord_admin"
    case 3:
      return "managing_agent"
    case 4:
      return "applicant"
    case 5:
      return "service_provider"
    default:
      return null
  }
}

export function deskPathForLevel(level: RoleLevel): string {
  switch (level) {
    case 0:
    case 1:
      return "/console"
    case 2:
      return "/landlord"
    case 3:
      return "/agent"
    case 4:
      return "/account"
    case 5:
      return "/provider"
  }
}

/** Landlord listing desk unlocks when org billing status is active/trial (or demo). */
export function subscriptionAllowsDesk(status: string | null | undefined): boolean {
  return status === "active" || status === "trial"
}

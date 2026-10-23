import { isStaffRole, type Role } from "@/lib/format"

/**
 * Easy Rental privilege ladder (preferences 2026-10-23).
 * Lower number = higher privilege. Anonymous has no level.
 */
export type RoleLevel = 0 | 1 | 2 | 3 | 4 | 5

export function roleLevelFor(role: Role | "anonymous"): RoleLevel | null {
  if (role === "anonymous") return null
  if (role === "super_admin") return 0
  if (isStaffRole(role)) return 1
  if (role === "landlord_admin") return 2
  if (role === "managing_agent") return 3
  if (role === "applicant") return 4
  if (role === "service_provider") return 5
  return null
}

export function roleLevelLabel(level: RoleLevel | null): string {
  if (level === null) return "anonymous"
  const labels = [
    "L0 SuperAdmin",
    "L1 Platform staff",
    "L2 Landlord",
    "L3 Managing agent",
    "L4 Applicant / occupant",
    "L5 Service provider",
  ] as const
  return labels[level]
}

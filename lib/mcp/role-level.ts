import type { Role } from "@/lib/format"
import {
  ROLE_LEVEL_LABEL,
  roleToLevel,
  type RoleLevel,
} from "@/lib/role-level"

export type { RoleLevel } from "@/lib/role-level"

/**
 * Easy Rental privilege ladder — single source in `lib/role-level.ts`.
 * Lower number = higher privilege. Anonymous has no level.
 */
export function roleLevelFor(role: Role | "anonymous"): RoleLevel | null {
  if (role === "anonymous") return null
  return roleToLevel(role)
}

export function roleLevelLabel(level: RoleLevel | null): string {
  if (level === null) return "anonymous"
  return ROLE_LEVEL_LABEL[level]
}

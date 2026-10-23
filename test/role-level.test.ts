import { describe, expect, it } from "vitest"
import {
  canImpersonate,
  canOpenConsole,
  normalizeRoleLevel,
  roleToLevel,
} from "@/lib/role-level"

describe("role_level ladder", () => {
  it("maps roles to L0–L5", () => {
    expect(roleToLevel("super_admin")).toBe(0)
    expect(roleToLevel("account_manager")).toBe(1)
    expect(roleToLevel("landlord_admin")).toBe(2)
    expect(roleToLevel("managing_agent")).toBe(3)
    expect(roleToLevel("applicant")).toBe(4)
    expect(roleToLevel("service_provider")).toBe(5)
  })

  it("gates console + impersonation to L0–L1", () => {
    expect(canOpenConsole(0)).toBe(true)
    expect(canOpenConsole(1)).toBe(true)
    expect(canOpenConsole(2)).toBe(false)
    expect(canImpersonate(1)).toBe(true)
    expect(canImpersonate(2)).toBe(false)
  })

  it("normalizes stored levels with role fallback", () => {
    expect(normalizeRoleLevel(0)).toBe(0)
    expect(normalizeRoleLevel("3")).toBe(3)
    expect(normalizeRoleLevel(null, "landlord_admin")).toBe(2)
    expect(normalizeRoleLevel(99, "super_admin")).toBe(0)
  })
})

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  closeDatabase,
  completeLandlordOnboarding,
  createPendingAccount,
  getUser,
  getUserByEmail,
  resetSeedDatabase,
  setTenantPackage,
} from "@/lib/db"
import {
  canImpersonate,
  canOpenConsole,
  normalizeRoleLevel,
  roleToLevel,
  subscriptionAllowsDesk,
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

describe("secure onboard + subscription gate", () => {
  beforeEach(() => {
    process.env.DESKULPT_DB_PATH = `/tmp/deskulpt-onboard-${process.pid}-${Date.now()}.sqlite`
    closeDatabase()
    resetSeedDatabase()
  })

  afterEach(() => {
    closeDatabase()
  })

  it("seeds admindeskulpt@gmail.com as L0", () => {
    const admin = getUserByEmail("admindeskulpt@gmail.com")
    expect(admin?.roleLevel).toBe(0)
    expect(admin?.role).toBe("super_admin")
  })

  it("L4 cannot be treated as landlord desk level", () => {
    const maya = getUser("u_maya")
    expect(maya?.roleLevel).toBe(4)
    expect(maya?.roleLevel === 2).toBe(false)
  })

  it("L2 needs active subscription after role pick", () => {
    const pending = createPendingAccount({
      name: "Riya Landlord",
      email: `landlord-${Date.now()}@example.com`,
      passwordHash: "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUV",
    })
    expect(pending.ok).toBe(true)
    if (!pending.ok) return
    const org = completeLandlordOnboarding({
      userId: pending.userId,
      company: "Test Parks Pvt Ltd",
    })
    expect(org.ok).toBe(true)
    if (!org.ok) return
    const before = getUser(pending.userId)!
    expect(before.roleLevel).toBe(2)
    expect(subscriptionAllowsDesk(before.tenantStatus)).toBe(false)

    const paid = setTenantPackage(org.tenantId, "growth")
    expect(paid.ok).toBe(true)
    const after = getUser(pending.userId)!
    expect(after.tenantStatus).toBe("active")
    expect(after.tenantPackage).toBe("growth")
    expect(subscriptionAllowsDesk(after.tenantStatus)).toBe(true)
  })
})


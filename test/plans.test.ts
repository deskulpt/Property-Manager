import { describe, expect, it, beforeEach, afterEach } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

describe("pricing plans catalog + activate", () => {
  let tmpDir: string
  let prevDb: string | undefined

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "er-plans-"))
    prevDb = process.env.DESKULPT_DB_PATH
    process.env.DESKULPT_DB_PATH = path.join(tmpDir, "test.sqlite")
  })

  afterEach(() => {
    if (prevDb === undefined) delete process.env.DESKULPT_DB_PATH
    else process.env.DESKULPT_DB_PATH = prevDb
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("exposes Free / Growth / Pro unit-metre cards + D02 entitlements (not per-property/year)", async () => {
    const {
      PUBLIC_PLANS,
      PLAN_LIMITS,
      parsePlanId,
      packageHasAskEasy,
      packageHasCustomDomain,
      planHasEntitlement,
      planLabel,
      PUBLIC_HOMES_SALE_INR,
    } = await import("@/lib/plans")

    const byId = Object.fromEntries(PUBLIC_PLANS.map((p) => [p.id, p]))
    expect(byId.starter.priceInr).toBe(0)
    expect(byId.starter.label).toBe("Free")
    expect(byId.growth.priceInr).toBe(PUBLIC_HOMES_SALE_INR)
    expect(byId.pro.priceInr).toBe(PUBLIC_HOMES_SALE_INR)
    expect(byId.enterprise.priceInr).toBeNull()
    expect(byId.growth.meterLabel.toLowerCase()).toContain("unit")
    expect(byId.growth.meterLabel.toLowerCase()).not.toContain("property / year")
    expect(planLabel("starter")).toBe("Free")
    expect(parsePlanId("basic")).toBe("starter")
    expect(packageHasCustomDomain("pro")).toBe(true)
    expect(packageHasCustomDomain("growth")).toBe(false)
    expect(packageHasAskEasy("pro")).toBe(true)
    expect(packageHasAskEasy("growth")).toBe(false)
    expect(packageHasAskEasy("starter")).toBe(false)

    expect(planHasEntitlement("starter", "assistant.read")).toBe(false)
    expect(planHasEntitlement("growth", "assistant.read")).toBe(true)
    expect(planHasEntitlement("growth", "assistant.draft")).toBe(false)
    expect(planHasEntitlement("pro", "assistant.propose")).toBe(true)
    expect(planHasEntitlement("enterprise", "mcp.access")).toBe(true)
    expect(planHasEntitlement("enterprise", "api.access")).toBe(true)
    expect(planHasEntitlement("enterprise", "automation.policies")).toBe(true)
    expect(planHasEntitlement("pro", "mcp.access")).toBe(false)
    expect(PLAN_LIMITS.pro.entitlements["assistant.draft"]).toBe(true)
  })

  it("setTenantPackage upgrades landlord org package", async () => {
    const { getDb, createLandlordAccount, getTenantPackage, setTenantPackage } = await import(
      "@/lib/db"
    )
    getDb()
    const created = createLandlordAccount({
      name: "Plan Tester",
      email: `plans-${Date.now()}@example.com`,
      passwordHash: "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUV",
      company: "Plans Co",
      packageTier: "starter",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(getTenantPackage(created.tenantId)).toBe("starter")
    const up = setTenantPackage(created.tenantId, "growth")
    expect(up.ok).toBe(true)
    expect(getTenantPackage(created.tenantId)).toBe("growth")
    const pro = setTenantPackage(created.tenantId, "pro")
    expect(pro.ok).toBe(true)
    expect(getTenantPackage(created.tenantId)).toBe("pro")
  })
})

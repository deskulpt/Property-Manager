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

  it("exposes Basic ₹499 / Growth ₹1,499 / Pro ₹2,999 proposed ladder", async () => {
    const {
      PUBLIC_PLANS,
      parsePlanId,
      packageHasAskEasy,
      packageHasCustomDomain,
      planLabel,
    } = await import("@/lib/plans")

    const byId = Object.fromEntries(PUBLIC_PLANS.map((p) => [p.id, p]))
    expect(byId.starter.priceInr).toBe(499)
    expect(byId.growth.priceInr).toBe(1499)
    expect(byId.pro.priceInr).toBe(2999)
    expect(byId.enterprise.priceInr).toBeNull()
    expect(planLabel("starter")).toBe("Basic")
    expect(parsePlanId("basic")).toBe("starter")
    expect(packageHasCustomDomain("pro")).toBe(true)
    expect(packageHasCustomDomain("growth")).toBe(false)
    expect(packageHasAskEasy("pro")).toBe(true)
    expect(packageHasAskEasy("starter")).toBe(false)
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

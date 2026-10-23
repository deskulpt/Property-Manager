import { beforeEach, describe, expect, it } from "vitest"
import { MARKET_CHECKLIST_KEYS } from "@/lib/market-checklist"
import { installTempDatabase } from "./helpers/temp-db"

installTempDatabase()

async function db() {
  return import("@/lib/db")
}

describe("tenant isolation and leasing commands", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
  })

  it("demo landlord has open applications", async () => {
    const { applicationsForTenant } = await db()
    const demo = applicationsForTenant("t_bbm")
    expect(demo.some((app) => app.status === "submitted")).toBe(true)
  })

  it("a newly signed-up landlord cannot load the demo property id", async () => {
    const { createLandlordAccount, propertyForLandlord } = await db()
    const created = createLandlordAccount({
      name: "Other Owner",
      email: `other-${crypto.randomUUID()}@example.com`,
      passwordHash: "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUV",
      company: "Other Realty Pvt Ltd",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(propertyForLandlord(created.tenantId, "p_waterman")).toBeNull()
    expect(propertyForLandlord("t_bbm", "p_waterman")?.slug).toBe("waterman")
  })

  it("approving Maya leases B2, posts rent+GST, and a second approve fails", async () => {
    const { decideApplication, getDb, applicationsForApplicant, ledgerForUser } = await db()

    const first = decideApplication("t_bbm", "app_maya", "approved")
    expect(first.ok).toBe(true)

    const unit = getDb().prepare("SELECT status FROM units WHERE id = ?").get("u_waterman_b2") as {
      status: string
    }
    expect(unit.status).toBe("leased")

    const mayaApps = applicationsForApplicant("u_maya")
    expect(mayaApps.find((app) => app.id === "app_maya")?.status).toBe("approved")

    const ledger = ledgerForUser("u_maya")
    expect(ledger.some((row) => row.kind === "rent" && row.status === "due")).toBe(true)
    expect(ledger.some((row) => row.kind === "gst" && row.status === "due")).toBe(true)

    const second = decideApplication("t_bbm", "app_maya", "approved")
    expect(second.ok).toBe(false)
  })

  it("a second late-fee assessment inserts no duplicate fees", async () => {
    const { assessLateFees, getDb } = await db()
    const before = Number(
      (getDb().prepare("SELECT COUNT(*) AS c FROM ledger_entries WHERE kind = 'late_fee'").get() as {
        c: number
      }).c,
    )
    const first = assessLateFees("t_bbm")
    const second = assessLateFees("t_bbm")
    const after = Number(
      (getDb().prepare("SELECT COUNT(*) AS c FROM ledger_entries WHERE kind = 'late_fee'").get() as {
        c: number
      }).c,
    )
    expect(first).toBeGreaterThanOrEqual(0)
    expect(second).toBe(0)
    expect(after).toBe(before + first)
  })

  it("Merchandiser CMS applicants list is empty; Property Manager emails are masked", async () => {
    const { cmsApplicants, getUser } = await db()
    const jordan = getUser("u_jordan")!
    const chris = getUser("u_chris")!
    expect(cmsApplicants(jordan)).toHaveLength(0)
    const rows = cmsApplicants(chris)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.email?.startsWith("••••@"))).toBe(true)
  })

  it("Service Manager role is not seeded; Devon ledger still exists for demo occupant", async () => {
    const { ledgerForUser, methodsForUser, getUser } = await db()
    expect(getUser("u_priya")).toBeNull()
    expect(ledgerForUser("u_devon").length).toBeGreaterThan(0)
    expect(methodsForUser("u_devon").length).toBeGreaterThan(0)
  })

  it("provider outside the demo service area cannot be approved", async () => {
    const { setProviderApproval, getDb } = await db()
    // Insert a provider whose area does not match demo property areas.
    getDb()
      .prepare(
        `INSERT INTO users (id, name, email, role, tenant_id, company, trade, service_area, provider_verified, phone, password_hash, is_demo)
         VALUES (?, ?, ?, 'service_provider', NULL, NULL, 'electrician', 'Whitefield', 1, NULL, NULL, 0)`,
      )
      .run("u_outsider", "Out Sider", "out@example.com")
    const approval = setProviderApproval("t_bbm", "u_outsider", "approved")
    expect(approval.ok).toBe(false)
  })

  it("public form countries stay India-only until a draft checklist is complete", async () => {
    const { publicFormCountries, createMarketDraft, setChecklistItem } = await db()

    expect(publicFormCountries().map((c) => c.iso)).toEqual(["IN"])

    const draft = createMarketDraft({ isoCode: "NZ", name: "New Zealand" })
    expect(draft.ok).toBe(true)
    if (!draft.ok) return
    expect(publicFormCountries().map((c) => c.iso)).toEqual(["IN"])

    for (const key of MARKET_CHECKLIST_KEYS) {
      setChecklistItem(draft.id, key, { done: true, notes: "e2e" })
    }
    expect(publicFormCountries().map((c) => c.iso).sort()).toEqual(["IN", "NZ"])
  })

  it("demo switcher list only includes is_demo users", async () => {
    const { listSessionUsers, createLandlordAccount } = await db()
    const before = listSessionUsers()
    expect(before.every((u) => u.isDemo)).toBe(true)
    const created = createLandlordAccount({
      name: "Real Landlord",
      email: `real-${crypto.randomUUID()}@example.com`,
      passwordHash: "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUV",
      company: "Real Holdings",
    })
    expect(created.ok).toBe(true)
    const after = listSessionUsers()
    expect(after.every((u) => u.isDemo)).toBe(true)
    expect(after.some((u) => u.id === (created.ok ? created.userId : ""))).toBe(false)
  })
})

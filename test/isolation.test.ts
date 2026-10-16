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

  it("BBM has open applications; Harbourline inbox is empty", async () => {
    const { applicationsForTenant } = await db()
    const bbm = applicationsForTenant("t_bbm")
    const harbour = applicationsForTenant("t_harbour")
    expect(bbm.some((app) => app.status === "submitted")).toBe(true)
    expect(harbour).toHaveLength(0)
  })

  it("Harbourline cannot load a BBM property id", async () => {
    const { propertyForLandlord } = await db()
    expect(propertyForLandlord("t_harbour", "p_waterman")).toBeNull()
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

  it("Service Manager has no CMS applicant rows while Devon ledger exists", async () => {
    const { getUser, ledgerForUser, methodsForUser, cmsApplicants } = await db()
    const priya = getUser("u_priya")!
    expect(cmsApplicants(priya)).toHaveLength(0)
    expect(ledgerForUser("u_devon").length).toBeGreaterThan(0)
    expect(methodsForUser("u_devon").length).toBeGreaterThan(0)
  })

  it("BBM provider Luis cannot take a Harbourline job until area-approved", async () => {
    const { assignJob, setProviderApproval, createJob } = await db()
    const job = createJob({
      tenantId: "t_harbour",
      propertyId: "p_commissioners",
      unitId: "u_commissioners_h1",
      title: "Isolation probe",
      details: "Should reject Luis until approved at Harbourline.",
      trade: "electrician",
      providerId: null,
    })
    expect(job.ok).toBe(true)
    if (!job.ok) return

    const denied = assignJob("t_harbour", job.id, "u_luis")
    expect(denied.ok).toBe(false)

    // Luis is Bhiwandi; Harbourline buildings are Sriperumbudur — area seam blocks approval.
    const approval = setProviderApproval("t_harbour", "u_luis", "approved")
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
})

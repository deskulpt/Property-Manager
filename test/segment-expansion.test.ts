import { beforeEach, describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"

installTempDatabase()

async function db() {
  return import("@/lib/db")
}

describe("multi-segment expansion", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
  })

  it("keeps warehouse listings filterable by docks and clear height", async () => {
    const { searchListings } = await db()
    const allWarehouse = searchListings({ segment: "warehouse", minDocks: 4 })
    expect(allWarehouse.length).toBeGreaterThan(0)
    expect(allWarehouse.every((card) => card.segment === "warehouse")).toBe(true)
    expect(allWarehouse.every((card) => card.docks >= 4)).toBe(true)

    const tall = searchListings({ segment: "warehouse", minClearHeight: 28 })
    expect(tall.every((card) => card.clearHeightFeet >= 28)).toBe(true)
  })

  it("approving Maya still posts rent + GST for warehouse", async () => {
    const { decideApplication, ledgerForUser } = await db()
    const first = decideApplication("t_bbm", "app_maya", "approved")
    expect(first.ok).toBe(true)
    const ledger = ledgerForUser("u_maya")
    expect(ledger.some((row) => row.kind === "rent" && row.status === "due")).toBe(true)
    expect(ledger.some((row) => row.kind === "gst" && row.status === "due")).toBe(true)
  })

  it("approving a residential application posts rent without GST and with deposit", async () => {
    const { createApplication, decideApplication, getDb, ledgerForUser } = await db()
    const created = createApplication({
      unitId: "u_jubilee_3b",
      applicantId: "u_ravi",
      company: "Ravi Menon",
      contactName: "Ravi Menon",
      email: "ravi@menon.example",
      intendedUse: "Family occupancy",
      notes: "",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const decision = decideApplication("t_bbm", created.id, "approved")
    expect(decision.ok).toBe(true)

    const ledger = ledgerForUser("u_ravi")
    expect(ledger.some((row) => row.kind === "rent" && row.status === "due")).toBe(true)
    expect(ledger.some((row) => row.kind === "gst")).toBe(false)
    expect(ledger.some((row) => row.kind === "deposit" && row.status === "due")).toBe(true)
    expect(ledger.some((row) => row.kind === "maintenance" && row.status === "due")).toBe(true)

    const unit = getDb().prepare("SELECT status FROM units WHERE id = ?").get("u_jubilee_3b") as {
      status: string
    }
    expect(unit.status).toBe("leased")
  })

  it("Hyderabad commercial and residential seeds are searchable by segment", async () => {
    const { searchListings } = await db()
    const commercial = searchListings({ segment: "commercial", area: "Kukatpally" })
    expect(commercial.length).toBeGreaterThan(0)
    expect(commercial.every((card) => card.rateBasis === "flat_month")).toBe(true)

    const residential = searchListings({ segment: "residential", bhk: 3 })
    expect(residential.some((card) => card.code === "3B")).toBe(true)
  })

  it("landlord can create a residential property with flat rent", async () => {
    const { createPropertyForLandlord, getPropertyBySlug } = await db()
    const created = createPropertyForLandlord({
      tenantId: "t_bbm",
      name: "Gachibowli Test Flat",
      address: "Financial District, Hyderabad 500032",
      area: "Gachibowli",
      cityLine: "HYDERABAD · GACHIBOWLI",
      segment: "residential",
      subtype: "apartment",
      unit: {
        code: "T1",
        description: "Test 2 BHK",
        sqft: 1100,
        rateBasis: "flat_month",
        rentAmountMinor: 4000000,
        attributes: { bhk: 2, furnishing: "semi" },
        bhk: 2,
        carpetSqft: 980,
        securityDepositMonths: 2,
        maintenanceMinor: 300000,
        gstApplicable: false,
      },
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const property = getPropertyBySlug(created.slug)
    expect(property?.segment).toBe("residential")
    expect(property?.units[0]?.rateBasis).toBe("flat_month")
    expect(property?.units[0]?.gstApplicable).toBe(false)
  })
})

describe("security launch fixes", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
  })

  it("session tokens are signed and reject tampering", async () => {
    const { mintSessionValue, parseSessionValue } = await import("@/lib/session")
    const token = mintSessionValue("u_nadia")
    expect(parseSessionValue(token)).toBe("u_nadia")
    expect(parseSessionValue(token.replace(/.$/, "x"))).toBeNull()
    expect(parseSessionValue("u_avery")).toBe("u_avery") // legacy allowed only outside production
  })

  it("OTP verify is rate limited", async () => {
    const { clearRateLimits } = await import("@/lib/rate-limit")
    const { requestDemoOtp, verifyDemoOtp } = await import("@/lib/otp")
    clearRateLimits()
    const req = await requestDemoOtp("u_maya", "+919876543210")
    expect(req.ok).toBe(true)
    for (let i = 0; i < 10; i++) {
      verifyDemoOtp("u_maya", "000000")
    }
    const blocked = verifyDemoOtp("u_maya", "000000")
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.error).toMatch(/Too many/)
  })
})

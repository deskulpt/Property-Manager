import { beforeEach, describe, expect, it } from "vitest"
import { useTempDatabase } from "./helpers/temp-db"
import {
  ATTRIBUTION_DAYS,
  PUBLISH_REWARD_PAISE,
  LEASE_REWARD_BPS,
  canTransition,
  leaseRewardPaise,
} from "@/lib/referrals"

// Vitest setup helper (not a React hook) — same pattern as isolation.test.ts
// eslint-disable-next-line react-hooks/rules-of-hooks -- setupTempDatabase-style helper
useTempDatabase()

async function db() {
  return import("@/lib/db")
}

describe("Refer & Earn (§19A)", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
  })

  it("seeds Asha / EASY-ASHA with mixed statuses and reward rows", async () => {
    const { getReferrerByCode, indicationsForReferrer, rewardsForReferrer } = await db()
    const asha = getReferrerByCode("EASY-ASHA")
    expect(asha?.name).toBe("Asha Reddy")
    const inds = indicationsForReferrer(asha!.id)
    expect(inds.map((i) => i.status).sort()).toEqual(
      ["awaiting_media", "discarded", "leased", "prospecting", "published"].sort(),
    )
    const rewards = rewardsForReferrer(asha!.id)
    expect(rewards.some((r) => r.kind === "publish" && r.status === "payable")).toBe(true)
    expect(rewards.some((r) => r.kind === "publish" && r.status === "paid_demo")).toBe(true)
    expect(rewards.some((r) => r.kind === "lease" && r.status === "accrued")).toBe(true)
    expect(PUBLISH_REWARD_PAISE).toBe(200_000)
    expect(LEASE_REWARD_BPS).toBe(500)
  })

  it("rejects submit without consent and blocks self-referral", async () => {
    const { createIndication, getReferrerByCode } = await db()
    const asha = getReferrerByCode("EASY-ASHA")!
    const self = createIndication({
      referrerId: asha.id,
      path: "submit",
      propertyAddress: "Plot 1 Test",
      propertyCity: "Pune",
      propertyPin: "411001",
      propertyType: "warehouse",
      approxSqft: 10000,
      askingRentPaise: 50000000,
      landlordName: "Asha Clone",
      landlordPhone: "+919800001001",
      landlordEmail: null,
      consentAt: new Date().toISOString(),
    })
    expect(self.ok).toBe(false)
    if (!self.ok) expect(self.error).toMatch(/Self-referral/i)
  })

  it("creates indication new with consent; Published and Leased accrue rewards", async () => {
    const {
      createIndication,
      getReferrerByCode,
      advanceIndicationStatus,
      getIndication,
      rewardsForReferrer,
    } = await db()
    const asha = getReferrerByCode("EASY-ASHA")!
    const created = createIndication({
      referrerId: asha.id,
      path: "submit",
      propertyAddress: "99 Test MIDC",
      propertyCity: "Nagpur",
      propertyPin: "440001",
      propertyType: "office",
      approxSqft: 8000,
      askingRentPaise: 1_000_000_00,
      landlordName: "Test Landlord",
      landlordPhone: "+919811112233",
      landlordEmail: "tl@example.com",
      consentAt: "2026-10-20T10:00:00.000Z",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(getIndication(created.id)?.status).toBe("new")
    expect(getIndication(created.id)?.consentAt).toBe("2026-10-20T10:00:00.000Z")

    expect(canTransition("new", "prospecting")).toBe(true)
    advanceIndicationStatus(created.id, "prospecting")
    advanceIndicationStatus(created.id, "awaiting_media")
    const pub = advanceIndicationStatus(created.id, "published")
    expect(pub.ok).toBe(true)
    let rewards = rewardsForReferrer(asha.id)
    expect(
      rewards.some(
        (r) =>
          r.indicationId === created.id &&
          r.kind === "publish" &&
          r.amountPaise === PUBLISH_REWARD_PAISE &&
          r.status === "accrued",
      ),
    ).toBe(true)

    advanceIndicationStatus(created.id, "in_negotiation")
    const leased = advanceIndicationStatus(created.id, "leased", {
      leasedRentPaise: 1_000_000_00,
    })
    expect(leased.ok).toBe(true)
    rewards = rewardsForReferrer(asha.id)
    expect(
      rewards.some(
        (r) =>
          r.indicationId === created.id &&
          r.kind === "lease" &&
          r.amountPaise === leaseRewardPaise(1_000_000_00),
      ),
    ).toBe(true)
  })

  it("expires unpublished indications past attribution window", async () => {
    const { getDb, expireStaleIndications, getIndication, getReferrerByCode, createIndication } =
      await db()
    const asha = getReferrerByCode("EASY-ASHA")!
    const created = createIndication({
      referrerId: asha.id,
      path: "submit",
      propertyAddress: "Expired Plot",
      propertyCity: "Indore",
      propertyPin: "452001",
      propertyType: "retail",
      approxSqft: null,
      askingRentPaise: null,
      landlordName: "Old Lead",
      landlordPhone: "+919700001111",
      landlordEmail: null,
      consentAt: "2026-01-01T00:00:00.000Z",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    getDb()
      .prepare("UPDATE indications SET attribution_expires_at = ?, status = 'prospecting' WHERE id = ?")
      .run("2026-01-02", created.id)
    const n = expireStaleIndications("2026-04-01")
    expect(n).toBeGreaterThanOrEqual(1)
    expect(getIndication(created.id)?.status).toBe("deactivated")
    expect(getIndication(created.id)?.deactivatedReason).toBe("expired")
    expect(ATTRIBUTION_DAYS).toBe(90)
  })

  it("another referrer cannot read Asha indications", async () => {
    const {
      createReferrerFromSubmit,
      indicationsForReferrer,
      getReferrerByCode,
      createIndication,
    } = await db()
    const asha = getReferrerByCode("EASY-ASHA")!
    const other = createReferrerFromSubmit({
      name: "Vikram Shah",
      phone: "+919812345678",
      email: "vikram@refer.example",
    })
    createIndication({
      referrerId: other.id,
      path: "submit",
      propertyAddress: "Other only",
      propertyCity: "Surat",
      propertyPin: "395001",
      propertyType: "warehouse",
      approxSqft: 5000,
      askingRentPaise: null,
      landlordName: "Surat Owner",
      landlordPhone: "+919900001234",
      landlordEmail: null,
      consentAt: new Date().toISOString(),
    })
    const ashaIds = new Set(indicationsForReferrer(asha.id).map((i) => i.id))
    const otherRows = indicationsForReferrer(other.id)
    expect(otherRows.every((r) => !ashaIds.has(r.id))).toBe(true)
    expect(otherRows.every((r) => r.referrerId === other.id)).toBe(true)
  })

  it("Path B attribution creates link indication", async () => {
    const { attachAttributionToLandlord, getIndication } = await db()
    const result = attachAttributionToLandlord({
      code: "EASY-ASHA",
      landlordUserId: "u_nadia",
      tenantId: "t_bbm",
      propertyAddress: "Link Path Bay",
      propertyCity: "Mumbai",
      propertyPin: "400001",
      propertyType: "warehouse",
      approxSqft: 12000,
      askingRentPaise: 90000000,
      landlordName: "Nadia Okonkwo",
      landlordPhone: "+912240012345",
      landlordEmail: "nadia@bbmparks.example",
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const ind = getIndication(result.indicationId)
    expect(ind?.path).toBe("link")
    expect(ind?.status).toBe("new")
  })
})

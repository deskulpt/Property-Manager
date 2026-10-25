import { describe, expect, it } from "vitest"
import {
  ANNUAL_MULTIPLIER,
  GST_BPS,
  SALE_END_UTC,
  SALE_MONTHLY_PAISE,
  SALE_START_UTC,
  STANDARD_MONTHLY_PAISE,
  applyBps,
  billableSegmentFromListing,
  isSaleActive,
  lockRatesFromQuote,
  quotePlatformBilling,
  volumeDiscountPct,
} from "@/lib/billing/pricing"

describe("platform billing pricing math", () => {
  it("maps listing segments to billable meters", () => {
    expect(billableSegmentFromListing("residential")).toBe("homes")
    expect(billableSegmentFromListing("commercial")).toBe("retail_office")
    expect(billableSegmentFromListing("warehouse")).toBe("industrial")
  })

  it("applies volume tiers", () => {
    expect(volumeDiscountPct(1)).toBe(0)
    expect(volumeDiscountPct(6)).toBe(15)
    expect(volumeDiscountPct(20)).toBe(15)
    expect(volumeDiscountPct(21)).toBe(25)
    expect(volumeDiscountPct(50)).toBe(25)
    expect(volumeDiscountPct(51)).toBe(0)
  })

  it("sale window and 500-account cap", () => {
    expect(isSaleActive(SALE_START_UTC, 0)).toBe(true)
    expect(isSaleActive(SALE_END_UTC, 499)).toBe(true)
    expect(isSaleActive(SALE_END_UTC + 1, 0)).toBe(false)
    expect(isSaleActive(SALE_START_UTC, 500)).toBe(false)
  })

  it("quotes one home monthly with sale (GST inclusive)", () => {
    const q = quotePlatformBilling({
      mix: [{ segment: "homes", count: 1 }],
      cadence: "monthly",
      nowMs: SALE_START_UTC + 1000,
      payingAccountCount: 0,
    })
    expect(q.pricingPath).toBe("sale")
    expect(q.chargedSubtotalPaise).toBe(SALE_MONTHLY_PAISE.homes)
    expect(q.standardSubtotalPaise).toBe(STANDARD_MONTHLY_PAISE.homes)
    expect(q.gstPaise).toBe(applyBps(SALE_MONTHLY_PAISE.homes, GST_BPS))
    expect(q.totalInclusivePaise).toBe(q.chargedSubtotalPaise + q.gstPaise)
    expect(q.strikeStandard).toBe(true)
    expect(q.standardFromLabel).toMatch(/1 Apr 2027/)
  })

  it("annual is 10× monthly", () => {
    const monthly = quotePlatformBilling({
      mix: [{ segment: "industrial", count: 2 }],
      cadence: "monthly",
      nowMs: SALE_END_UTC + 86_400_000,
      payingAccountCount: 0,
    })
    const annual = quotePlatformBilling({
      mix: [{ segment: "industrial", count: 2 }],
      cadence: "annual",
      nowMs: SALE_END_UTC + 86_400_000,
      payingAccountCount: 0,
    })
    expect(annual.chargedSubtotalPaise).toBe(monthly.chargedSubtotalPaise * ANNUAL_MULTIPLIER)
  })

  it("sale (~50% off) beats volume (max 25%) whenever the sale is active", () => {
    const q = quotePlatformBilling({
      mix: [{ segment: "industrial", count: 25 }],
      cadence: "monthly",
      nowMs: SALE_START_UTC + 1000,
      payingAccountCount: 0,
    })
    expect(q.pricingPath).toBe("sale")
    expect(q.chargedSubtotalPaise).toBe(25 * SALE_MONTHLY_PAISE.industrial)
    expect(q.volumeDiscountPct).toBe(0)
  })

  it("applies volume after the sale window (no stacking)", () => {
    const volumeTotal = Math.round(25 * STANDARD_MONTHLY_PAISE.industrial * 0.75)
    const q = quotePlatformBilling({
      mix: [{ segment: "industrial", count: 25 }],
      cadence: "monthly",
      nowMs: SALE_END_UTC + 86_400_000,
      payingAccountCount: 0,
    })
    expect(q.pricingPath).toBe("volume")
    expect(q.volumeDiscountPct).toBe(25)
    expect(q.chargedSubtotalPaise).toBe(volumeTotal)
  })

  it("never multiplies sale rates by volume percent", () => {
    const q = quotePlatformBilling({
      mix: [{ segment: "retail_office", count: 10 }],
      cadence: "monthly",
      nowMs: SALE_START_UTC + 1000,
      payingAccountCount: 0,
    })
    expect(q.chargedSubtotalPaise).toBe(10 * SALE_MONTHLY_PAISE.retail_office)
    expect(q.chargedSubtotalPaise).not.toBe(
      Math.round(10 * SALE_MONTHLY_PAISE.retail_office * 0.85),
    )
  })

  it("honours locked rates during price lock", () => {
    const q = quotePlatformBilling({
      mix: [{ segment: "homes", count: 2 }],
      cadence: "monthly",
      nowMs: SALE_END_UTC + 86_400_000,
      lockedMonthlyPaise: { homes: 149_00 },
      priceLockUntilIso: "2028-01-01T00:00:00.000Z",
    })
    expect(q.chargedSubtotalPaise).toBe(2 * 149_00)
    expect(q.lockedUntilIso).toBe("2028-01-01T00:00:00.000Z")
  })

  it("lockRatesFromQuote captures sale monthly rates", () => {
    const q = quotePlatformBilling({
      mix: [{ segment: "homes", count: 1 }],
      cadence: "annual",
      nowMs: SALE_START_UTC + 1000,
      payingAccountCount: 0,
    })
    const locked = lockRatesFromQuote(q)
    expect(locked.homes).toBe(SALE_MONTHLY_PAISE.homes)
  })
})

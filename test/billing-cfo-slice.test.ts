import { describe, expect, it } from "vitest"
import {
  AFFILIATE_PROGRAM_ACTIVE,
  affiliateAccrualAllowed,
} from "@/lib/billing/affiliate-terms"
import {
  AI_ALERT_THRESHOLD,
  aiCostShareExceedsTarget,
  aiMeterSnapshot,
} from "@/lib/billing/ai-meter"
import {
  D11_DOCUMENTED,
  commerceRoleForProvider,
  rentMaySettleOnPlatformBooks,
} from "@/lib/billing/commerce-roles"
import {
  assertDistinctApprover,
  requiresDualControl,
} from "@/lib/billing/dual-control"
import { assertLiveMoneyAllowed, evaluateGoLiveGate } from "@/lib/billing/go-live-gate"
import {
  ANNUAL_MULTIPLIER,
  SALE_END_UTC,
  SALE_MONTHLY_PAISE,
  SALE_START_UTC,
  STANDARD_MONTHLY_PAISE,
  graduatedVolumeSubtotalPaise,
  quotePlatformBilling,
} from "@/lib/billing/pricing"
import { quoteSubscriptionTax } from "@/lib/billing/tax"
import { PLAN_LIMITS } from "@/lib/plans"

describe("CFO tax adapter (DEMO)", () => {
  it("India B2B with GSTIN → reverse charge (no platform GST)", () => {
    const q = quoteSubscriptionTax({
      exclusiveMinor: 10_000_00,
      customer: { country: "IN", kind: "business", taxId: "22AAAAA0000A1Z5" },
    })
    expect(q.treatment).toBe("in_b2b_reverse_charge")
    expect(q.taxMinor).toBe(0)
    expect(q.collector).toBe("customer_reverse_charge")
    expect(q.labelledDemo).toBe(true)
  })

  it("India B2C without IN GST registration → blocked dependency", () => {
    const q = quoteSubscriptionTax({
      exclusiveMinor: 10_000_00,
      customer: { country: "IN", kind: "consumer" },
    })
    expect(q.treatment).toBe("blocked_missing_registration")
    expect(q.dependencies.some((d) => /OIDAR/i.test(d))).toBe(true)
  })

  it("Canada ON → HST 13%", () => {
    const q = quoteSubscriptionTax({
      exclusiveMinor: 10_000_00,
      customer: { country: "CA", region: "ON", kind: "business", taxId: "BN123" },
    })
    expect(q.treatment).toBe("ca_gst_hst")
    expect(q.taxMinor).toBe(1_300_00)
  })

  it("MoR collects → adapter steps aside", () => {
    const q = quoteSubscriptionTax({
      exclusiveMinor: 10_000_00,
      customer: { country: "IN", kind: "consumer", morCollectsTax: true },
    })
    expect(q.treatment).toBe("mor_collects")
    expect(q.taxMinor).toBe(0)
    expect(q.collector).toBe("mor")
  })

  it("export → zero-rated demo framing", () => {
    const q = quoteSubscriptionTax({
      exclusiveMinor: 5_000_00,
      customer: { country: "US", kind: "business", taxId: "EIN" },
    })
    expect(q.treatment).toBe("zero_rated_export")
    expect(q.taxMinor).toBe(0)
  })
})

describe("graduated volume + no-stack (D01 CFO)", () => {
  it("graduated: 25 industrial units ≠ flat 25% off all", () => {
    const flatAll = Math.round(25 * STANDARD_MONTHLY_PAISE.industrial * 0.75)
    const { subtotalPaise } = graduatedVolumeSubtotalPaise(
      [{ segment: "industrial", count: 25 }],
      "monthly",
    )
    // 1–5 full + 6–20 @15% + 21–25 @25%
    const expected =
      5 * STANDARD_MONTHLY_PAISE.industrial +
      Math.round(15 * STANDARD_MONTHLY_PAISE.industrial * 0.85) +
      Math.round(5 * STANDARD_MONTHLY_PAISE.industrial * 0.75)
    expect(subtotalPaise).toBe(expected)
    expect(subtotalPaise).not.toBe(flatAll)
    expect(subtotalPaise).toBeGreaterThan(flatAll)
  })

  it("sale vs volume exclusive — no stack; sale wins when cheaper", () => {
    const q = quotePlatformBilling({
      mix: [{ segment: "industrial", count: 25 }],
      cadence: "monthly",
      nowMs: SALE_START_UTC + 1000,
      payingAccountCount: 0,
    })
    expect(q.discountsStacked).toBe(false)
    expect(q.pricingPath).toBe("sale")
    expect(q.chargedSubtotalPaise).toBe(25 * SALE_MONTHLY_PAISE.industrial)
  })

  it("after sale window uses graduated volume path", () => {
    const q = quotePlatformBilling({
      mix: [{ segment: "industrial", count: 25 }],
      cadence: "monthly",
      nowMs: SALE_END_UTC + 86_400_000,
      payingAccountCount: 0,
    })
    expect(q.pricingPath).toBe("volume")
    const { subtotalPaise } = graduatedVolumeSubtotalPaise(
      [{ segment: "industrial", count: 25 }],
      "monthly",
    )
    expect(q.chargedSubtotalPaise).toBe(subtotalPaise)
  })

  it("affiliate path cannot stack with sale", () => {
    const q = quotePlatformBilling({
      mix: [{ segment: "homes", count: 1 }],
      cadence: "monthly",
      nowMs: SALE_START_UTC + 1000,
      payingAccountCount: 0,
      affiliateDiscountBps: 2000,
    })
    expect(q.discountsStacked).toBe(false)
    expect(q.pricingPath).toBe("sale")
  })

  it("annual sets deferred revenue recognition stub", () => {
    const q = quotePlatformBilling({
      mix: [{ segment: "homes", count: 1 }],
      cadence: "annual",
      nowMs: SALE_END_UTC + 86_400_000,
      payingAccountCount: 0,
    })
    expect(q.chargedSubtotalPaise).toBe(STANDARD_MONTHLY_PAISE.homes * ANNUAL_MULTIPLIER)
    expect(q.deferredRevenue).not.toBeNull()
    expect(q.deferredRevenue!.months).toBe(12)
    expect(q.deferredRevenue!.prepaidPaise).toBe(q.chargedSubtotalPaise)
  })

  it("uses tax adapter when customer provided", () => {
    const q = quotePlatformBilling({
      mix: [{ segment: "homes", count: 1 }],
      cadence: "monthly",
      nowMs: SALE_END_UTC + 86_400_000,
      taxCustomer: { country: "CA", region: "AB", kind: "consumer" },
    })
    expect(q.taxQuote?.treatment).toBe("ca_gst_hst")
    expect(q.gstPaise).toBe(q.taxQuote!.taxMinor)
  })
})

describe("AI meter + caps (D02/D06)", () => {
  it("alerts at 80% and downgrades model at hard cap", () => {
    const warn = aiMeterSnapshot({
      plan: "pro",
      accountSpentUsdCents: 6_000, // of 7500 cap
      envSpentUsdCents: 1_000,
      preferredTier: "premium",
    })
    expect(warn.alert80Account).toBe(true)
    expect(warn.hardBlocked).toBe(false)
    expect(warn.effectiveModelTier).toBe("standard")

    const blocked = aiMeterSnapshot({
      plan: "pro",
      accountSpentUsdCents: 7_500,
      envSpentUsdCents: 1_000,
      preferredTier: "premium",
    })
    expect(blocked.hardBlocked).toBe(true)
    expect(blocked.effectiveModelTier).toBe("cheap")
    expect(AI_ALERT_THRESHOLD).toBe(0.8)
  })

  it("flags AI cost share above 15% revenue", () => {
    expect(aiCostShareExceedsTarget(200, 1_000)).toBe(true)
    expect(aiCostShareExceedsTarget(100, 1_000)).toBe(false)
  })
})

describe("dual-control stubs (D09) — not productionReady", () => {
  it("requires dual control above threshold and blocks self-approval", () => {
    const d = requiresDualControl({ action: "large_refund", amountUsdCents: 60_000 })
    expect(d.required).toBe(true)
    expect(d.productionReady).toBe(false)
    expect(assertDistinctApprover({ requesterUserId: "a", approverUserId: "a" }).ok).toBe(false)
    expect(assertDistinctApprover({ requesterUserId: "a", approverUserId: "b" }).ok).toBe(true)
  })
})

describe("go-live gate fail-closed (D10)", () => {
  it("defaults not ready; all flags required", () => {
    const gate = evaluateGoLiveGate()
    expect(gate.readyForLiveMoney).toBe(false)
    expect(gate.blockers.length).toBe(4)
    expect(assertLiveMoneyAllowed().ok).toBe(false)

    const open = evaluateGoLiveGate({
      live_tax_rates: true,
      signed_mor_contract: true,
      kyc_vendor_dpa: true,
      test_invoice_tax_lines: true,
    })
    expect(open.readyForLiveMoney).toBe(true)
  })
})

describe("D11/D12/D15 documented not active", () => {
  it("PayPal is processor not MoR; rent never Deskulpt books", () => {
    expect(commerceRoleForProvider("dodo")).toBe("mor")
    expect(commerceRoleForProvider("paypal")).toBe("processor")
    expect(rentMaySettleOnPlatformBooks()).toBe(false)
    expect(D11_DOCUMENTED.alokeApproved).toBe(false)
  })

  it("affiliate inactive", () => {
    expect(AFFILIATE_PROGRAM_ACTIVE).toBe(false)
    expect(affiliateAccrualAllowed()).toBe(false)
  })

  it("Matterport not included in base plans; media caps set", () => {
    expect(PLAN_LIMITS.pro.matterportIncluded).toBe(false)
    expect(PLAN_LIMITS.pro.matterportTours).toBe(0)
    expect(PLAN_LIMITS.growth.mediaStorageCapMb).toBeGreaterThan(0)
  })
})

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
  deskulptMayHoldDeposits,
  razorpayRouteAllowed,
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
import { resolvePrimaryProviderName } from "@/lib/billing/routing"
import {
  D13_LEGAL_WORDING,
  LEGAL_CFO_RENT_RAIL_CONFLICT,
  LEGAL_FEATURE_FLAGS,
} from "@/lib/billing/legal-flags"
import { quoteLandlordSurcharge } from "@/lib/billing/surcharge"
import { quoteSubscriptionTax } from "@/lib/billing/tax"
import { PLAN_LIMITS } from "@/lib/plans"

describe("CFO tax adapter — Stripe Tax path (DEMO)", () => {
  it("India B2B with GSTIN → reverse charge", () => {
    const q = quoteSubscriptionTax({
      exclusiveMinor: 10_000_00,
      customer: { country: "IN", kind: "business", taxId: "22AAAAA0000A1Z5", region: "TG" },
    })
    expect(q.treatment).toBe("in_b2b_reverse_charge")
    expect(q.taxMinor).toBe(0)
    expect(q.collector).toBe("customer_reverse_charge")
    expect(q.launchMarket).toBe("telangana")
  })

  it("India B2C without registration → blocked", () => {
    const q = quoteSubscriptionTax({
      exclusiveMinor: 10_000_00,
      customer: { country: "IN", kind: "consumer" },
    })
    expect(q.treatment).toBe("blocked_missing_registration")
    expect(q.dependencies.length).toBeGreaterThan(0)
  })

  it("Canada ON → Stripe Tax HST 13%; Deskulpt remits", () => {
    const q = quoteSubscriptionTax({
      exclusiveMinor: 10_000_00,
      customer: { country: "CA", region: "ON", kind: "business", taxId: "BN123" },
    })
    expect(q.treatment).toBe("ca_gst_hst_stripe_tax")
    expect(q.collector).toBe("deskulpt_via_stripe_tax")
    expect(q.taxMinor).toBe(1_300_00)
    expect(q.launchMarket).toBe("ontario")
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
  })

  it("uses Stripe Tax adapter when customer provided", () => {
    const q = quotePlatformBilling({
      mix: [{ segment: "homes", count: 1 }],
      cadence: "monthly",
      nowMs: SALE_END_UTC + 86_400_000,
      taxCustomer: { country: "CA", region: "ON", kind: "consumer" },
    })
    expect(q.taxQuote?.treatment).toBe("ca_gst_hst_stripe_tax")
    expect(q.gstPaise).toBe(q.taxQuote!.taxMinor)
  })
})

describe("AI meter + caps (D02/D06)", () => {
  it("alerts at 80% and downgrades model at hard cap", () => {
    const warn = aiMeterSnapshot({
      plan: "pro",
      accountSpentUsdCents: 6_000,
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

describe("dual-control Finance Approve policy (D09) — Eng still not productionReady", () => {
  it("refunds > CAD500 or >1 mo sub; payouts always; no self-approve", () => {
    expect(
      requiresDualControl({ action: "large_refund", amountCadCents: 60_000 }).required,
    ).toBe(true)
    expect(
      requiresDualControl({
        action: "large_refund",
        amountCadCents: 40_000,
        oneMonthSubscriptionCadCents: 30_000,
      }).required,
    ).toBe(true)
    expect(requiresDualControl({ action: "payout", amountCadCents: 1 }).required).toBe(true)
    expect(requiresDualControl({ action: "deposit_release" }).required).toBe(true)
    expect(assertDistinctApprover({ requesterUserId: "a", approverUserId: "a" }).ok).toBe(false)
    expect(assertDistinctApprover({ requesterUserId: "a", approverUserId: "b" }).ok).toBe(true)
    expect(
      requiresDualControl({ action: "large_refund", amountCadCents: 10_000 }).productionReady,
    ).toBe(false)
  })
})

describe("go-live gate fail-closed (D10) — Stripe + no Route", () => {
  it("defaults not ready; includes Route/deposit checks", () => {
    const gate = evaluateGoLiveGate()
    expect(gate.readyForLiveMoney).toBe(false)
    expect(gate.blockers.length).toBe(6)
    expect(assertLiveMoneyAllowed().ok).toBe(false)

    const open = evaluateGoLiveGate({
      live_tax_rates: true,
      signed_stripe_agreement: true,
      kyc_vendor_dpa: true,
      test_invoice_tax_lines: true,
      no_route_splits_confirmed: true,
      deposits_not_held_confirmed: true,
    })
    expect(open.readyForLiveMoney).toBe(true)
  })
})

describe("D11 BM — Stripe subscriptions; no Route; surcharge separate", () => {
  it("Stripe is subscription processor; Route forbidden; deposits not held", () => {
    expect(resolvePrimaryProviderName()).toBe("stripe")
    expect(commerceRoleForProvider("stripe")).toBe("processor")
    expect(razorpayRouteAllowed()).toBe(false)
    expect(deskulptMayHoldDeposits()).toBe(false)
    expect(rentMaySettleOnPlatformBooks()).toBe(false)
    expect(D11_DOCUMENTED.alokeApproved).toBe(false)
    expect(D11_DOCUMENTED.razorpayRoute).toBe(false)
  })

  it("surcharge is separate Stripe invoice after settlement — not Route", () => {
    const s = quoteLandlordSurcharge({ settledRentMinor: 100_000, surchargeBps: 250 })
    expect(s.viaRoute).toBe(false)
    expect(s.invoiceProcessor).toBe("stripe")
    expect(s.timing).toBe("after_rent_settlement")
    expect(s.surchargeExclusiveMinor).toBe(2_500)
  })

  it("affiliate inactive; Matterport not in base", () => {
    expect(AFFILIATE_PROGRAM_ACTIVE).toBe(false)
    expect(affiliateAccrualAllowed()).toBe(false)
    expect(PLAN_LIMITS.pro.matterportIncluded).toBe(false)
  })

  it("Legal flags OFF; D13 wording; OPEN Legal↔CFO rent-rail conflict", () => {
    expect(LEGAL_FEATURE_FLAGS.routeRentSplits).toBe(false)
    expect(LEGAL_FEATURE_FLAGS.depositHoldsOnDeskulpt).toBe(false)
    expect(LEGAL_FEATURE_FLAGS.affiliateLive).toBe(false)
    expect(LEGAL_FEATURE_FLAGS.realPiiAiConnectorsMedia).toBe(false)
    expect(D13_LEGAL_WORDING).toContain("Telangana and Ontario selected")
    expect(LEGAL_CFO_RENT_RAIL_CONFLICT.status).toBe("OPEN")
    expect(LEGAL_CFO_RENT_RAIL_CONFLICT.codeFollows).toBe("cfo_bm")
  })
})

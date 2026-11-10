/**
 * Landlord % surcharge after rent settlement (Aloke BM + CFO D11).
 * Separate Stripe invoice — NOT Razorpay Route / NOT split from rent.
 * DEMO/STUB — disclosed % only; no live charges.
 */

export const SURCHARGE_VIA_ROUTE = false
export const SURCHARGE_INVOICE_PROCESSOR = "stripe" as const

export type SurchargeQuote = {
  /** Basis = rent that already settled on landlord rails (minor units) */
  settledRentMinor: number
  surchargeBps: number
  surchargeExclusiveMinor: number
  currency: string
  invoiceProcessor: "stripe"
  viaRoute: false
  timing: "after_rent_settlement"
  autoCollect: "card_or_mandate"
  disclosedToLandlord: true
  labelledDemo: true
}

/** Default disclosed surcharge bps — commercial % TBD (demo 0 until Aloke sets). */
export const DEFAULT_SURCHARGE_BPS = 0

export function quoteLandlordSurcharge(input: {
  settledRentMinor: number
  surchargeBps?: number
  currency?: string
}): SurchargeQuote {
  const bps = Math.max(0, Math.min(10_000, input.surchargeBps ?? DEFAULT_SURCHARGE_BPS))
  const settled = Math.max(0, Math.round(input.settledRentMinor))
  return {
    settledRentMinor: settled,
    surchargeBps: bps,
    surchargeExclusiveMinor: Math.round((settled * bps) / 10_000),
    currency: input.currency ?? "CAD",
    invoiceProcessor: "stripe",
    viaRoute: false,
    timing: "after_rent_settlement",
    autoCollect: "card_or_mandate",
    disclosedToLandlord: true,
    labelledDemo: true,
  }
}

/**
 * Finance D11 (Ontario) — Approve with changes (DEMO/STUB).
 * NOT Aloke-approved. Legal ON tenant-fee / provider-reg still pending → flag OFF.
 *
 * Model:
 * - Rent via Stripe Connect DIRECT on landlord connected account
 *   (not destination charges / not separate charges)
 * - Rent by PAD (pre-authorized debit)
 * - Deskulpt revenue = application fee only, includes 13% HST
 * - Monthly landlord statement with Deskulpt GST/HST number
 * - No fees to tenants
 * - Reverse application fee if PAD disputed
 * - Separate invoice path remains for markets without Connect
 *
 * Pricing config-only (amounts NOT final):
 * - CA$3–5 / unit / mo
 * - 0.5–1% payments fee, capped CA$15 / unit / mo
 * - CA$10 / mo minimum per landlord on payments plans
 */

export const ONTARIO_CONNECT_FEATURE = {
  /** Legal ON tenant-fee / provider-reg pending — keep OFF */
  enabled: false,
  chargeType: "direct" as const,
  notAllowed: ["destination", "separate_charges"] as const,
  rentPaymentMethod: "pad" as const,
  deskulptRevenue: "application_fee_only" as const,
  applicationFeeIncludesHst: true,
  hstBps: 1300, // 13%
  feesToTenants: false,
  reverseFeeOnPadDispute: true,
  monthlyLandlordStatement: true,
  statementIncludesGstHstNumber: true,
  alokeApproved: false,
  financeStatus: "approve_with_changes" as const,
  legalTenantFeeProviderReg: "pending" as const,
  labelledDemo: true as const,
}

/** Config-only — amounts not commercially final. Minor units = CAD cents. */
export const ONTARIO_PRICING_CONFIG = {
  currency: "CAD" as const,
  unitMonthlyFeeCadCentsMin: 300, // CA$3
  unitMonthlyFeeCadCentsMax: 500, // CA$5
  paymentsFeeBpsMin: 50, // 0.5%
  paymentsFeeBpsMax: 100, // 1%
  paymentsFeeCapCadCentsPerUnitMo: 1_500, // CA$15
  landlordPaymentsPlanMinCadCentsMo: 1_000, // CA$10
  amountsFinal: false,
  labelledDemo: true as const,
}

export type OntarioAppFeeQuote = {
  rentCadCents: number
  applicationFeeExclusiveCadCents: number
  hstCadCents: number
  applicationFeeInclusiveCadCents: number
  feesToTenant: false
  chargeType: "direct"
  labelledDemo: true
}

/**
 * Illustrative application-fee quote (config midpoints — not final pricing).
 * Fee% of rent within bps range, capped per unit, then +13% HST on fee.
 */
export function quoteOntarioApplicationFee(input: {
  rentCadCents: number
  paymentsFeeBps?: number
  unitCount?: number
}): OntarioAppFeeQuote {
  const rent = Math.max(0, Math.round(input.rentCadCents))
  const bps = Math.min(
    ONTARIO_PRICING_CONFIG.paymentsFeeBpsMax,
    Math.max(
      ONTARIO_PRICING_CONFIG.paymentsFeeBpsMin,
      input.paymentsFeeBps ?? ONTARIO_PRICING_CONFIG.paymentsFeeBpsMin,
    ),
  )
  const units = Math.max(1, Math.floor(input.unitCount ?? 1))
  let feeEx = Math.round((rent * bps) / 10_000)
  const cap = ONTARIO_PRICING_CONFIG.paymentsFeeCapCadCentsPerUnitMo * units
  feeEx = Math.min(feeEx, cap)
  const hst = Math.round((feeEx * ONTARIO_CONNECT_FEATURE.hstBps) / 10_000)
  return {
    rentCadCents: rent,
    applicationFeeExclusiveCadCents: feeEx,
    hstCadCents: hst,
    applicationFeeInclusiveCadCents: feeEx + hst,
    feesToTenant: false,
    chargeType: "direct",
    labelledDemo: true,
  }
}

/** Markets without Connect keep separate Stripe invoice / surcharge path. */
export function useSeparateInvoicePath(market: "ontario" | "other"): boolean {
  if (market === "ontario" && ONTARIO_CONNECT_FEATURE.enabled) return false
  return true
}

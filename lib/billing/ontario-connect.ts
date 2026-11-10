/**
 * Finance D11 (Ontario) AwC + Legal AwC — **design/test only, not live**.
 * Aloke Approve with advisors' changes — not fully approved. Feature flag OFF.
 *
 * Finance model:
 * - Stripe Connect DIRECT on landlord connected account (not destination/separate)
 * - Rent by PAD (optional never mandatory — Legal)
 * - Deskulpt revenue = application fee only
 * - Legal: Connect app fee does NOT calculate HST — **compute/remit ourselves** (13%)
 * - Monthly landlord statement with Deskulpt GST/HST number (from tax-identity / PRD)
 * - No fees to tenants; tenant card convenience fee **permanently OFF** (RTA s134)
 * - Reverse application fee if PAD disputed
 * - Separate invoice path for markets without Connect
 * - Quebec: card surcharges prohibited
 *
 * Before live (Legal): funds-flow diagram+contracts; Stripe use-case acceptance; ON counsel + CPA.
 * Stripe customer ≠ BoC payment-provider reg / FINTRAC MSB exemption — Deskulpt-specific assessment.
 */

import {
  DESKULPT_CANADA_GST_HST_NUMBER,
  DESKULPT_CANADA_LEGAL_NAME,
  landlordStatementTaxBlock,
} from "@/lib/billing/tax-identity"

export const ONTARIO_CONNECT_FEATURE = {
  enabled: false,
  legalMode: "design_test_only_not_live" as const,
  chargeType: "direct" as const,
  notAllowed: ["destination", "separate_charges"] as const,
  rentPaymentMethod: "pad" as const,
  padOptionalNeverMandatory: true,
  deskulptRevenue: "application_fee_only" as const,
  /** Stripe Connect does not calc HST on app fee — we compute */
  connectAppFeeCalculatesHst: false,
  computeAndRemitHstOurselves: true,
  applicationFeeIncludesHst: true,
  hstBps: 1300,
  feesToTenants: false,
  tenantCardConvenienceFee: false,
  tenantCardConvenienceFeePermanentOff: true,
  reverseFeeOnPadDispute: true,
  monthlyLandlordStatement: true,
  statementIncludesGstHstNumber: true,
  /** From CANADA_PACK.taxRegistrationId via tax-identity — checklist resolved (#47 source) */
  statementSellerLegalName: DESKULPT_CANADA_LEGAL_NAME,
  statementGstHstNumber: DESKULPT_CANADA_GST_HST_NUMBER,
  gstHstNumberResolved: true,
  gstHstNumberSource: "canada_pack.taxRegistrationId" as const,
  quebecCardSurchargeProhibited: true,
  requiresExpressLandlordServiceDeductionAgreement: true,
  creditTenantFullRentPaid: true,
  beforeLive: [
    "funds_flow_diagram_and_contracts",
    "stripe_use_case_acceptance",
    "ontario_counsel",
    "cpa",
    "deskulpt_boc_fintrac_assessment",
  ] as const,
  alokeApproved: false,
  financeStatus: "approve_with_changes" as const,
  legalStatus: "approve_with_changes_design_test_only" as const,
  labelledDemo: true as const,
}

/** Config-only — amounts not commercially final. CAD cents. */
export const ONTARIO_PRICING_CONFIG = {
  currency: "CAD" as const,
  unitMonthlyFeeCadCentsMin: 300,
  unitMonthlyFeeCadCentsMax: 500,
  paymentsFeeBpsMin: 50,
  paymentsFeeBpsMax: 100,
  paymentsFeeCapCadCentsPerUnitMo: 1_500,
  landlordPaymentsPlanMinCadCentsMo: 1_000,
  /** Legal landlord-paid commission band 1–2% (needs express agreement) */
  landlordCommissionPercentMin: 1,
  landlordCommissionPercentMax: 2,
  amountsFinal: false,
  labelledDemo: true as const,
}

export type OntarioAppFeeQuote = {
  rentCadCents: number
  applicationFeeExclusiveCadCents: number
  /** HST we compute/remit — not Stripe Connect auto */
  hstCadCents: number
  applicationFeeInclusiveCadCents: number
  feesToTenant: false
  chargeType: "direct"
  hstComputedBy: "deskulpt"
  sellerLegalName: typeof DESKULPT_CANADA_LEGAL_NAME
  /** From CANADA_PACK.taxRegistrationId */
  gstHstNumber: string
  labelledDemo: true
}

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
  const tax = landlordStatementTaxBlock({
    applicationFeeExclusiveCadCents: feeEx,
    hstBps: ONTARIO_CONNECT_FEATURE.hstBps,
  })
  return {
    rentCadCents: rent,
    applicationFeeExclusiveCadCents: tax.applicationFeeExclusiveCadCents,
    hstCadCents: tax.hstCadCents,
    applicationFeeInclusiveCadCents: tax.applicationFeeInclusiveCadCents,
    feesToTenant: false,
    chargeType: "direct",
    hstComputedBy: "deskulpt",
    sellerLegalName: tax.sellerLegalName,
    gstHstNumber: tax.gstHstNumber,
    labelledDemo: true,
  }
}

/** Monthly landlord statement tax footer (GST/HST # from CANADA_PACK). */
export function ontarioMonthlyStatementTaxFooter(input: {
  applicationFeeExclusiveCadCents: number
}) {
  return {
    ...landlordStatementTaxBlock(input),
    currency: "CAD" as const,
    note: "Application fee HST computed/remitted by Deskulpt (Connect does not calc HST)",
    labelledDemo: true as const,
  }
}

export function useSeparateInvoicePath(market: "ontario" | "other"): boolean {
  if (market === "ontario" && ONTARIO_CONNECT_FEATURE.enabled) return false
  return true
}

/**
 * Billing-side legal/money gates (DEMO).
 * Canonical money flag **names** match Admin compliance console + CountryPack
 * (`lib/markets/legal-flags.ts` / #47). Build behind toggles; do not block demos.
 * D11–D15 Aloke AwC — not fully approved; live gates stay OFF.
 */

import {
  DESKULPT_CANADA_GST_HST_NUMBER,
  DESKULPT_CANADA_LEGAL_NAME,
} from "@/lib/billing/tax-identity"
import {
  LEGAL_FEATURE_FLAG_KEYS,
  LEGAL_FEATURE_FLAGS_OFF,
  legalFlag,
  type LegalFeatureFlagKey,
} from "@/lib/markets/legal-flags"

/** Re-export canonical catalog for Admin console / billing callers. */
export {
  LEGAL_FEATURE_FLAG_KEYS,
  LEGAL_FEATURE_FLAGS_OFF,
  legalFlag,
}
export type { LegalFeatureFlagKey }

/**
 * Billing defaults — same keys/names as markets catalog, all fail-closed OFF.
 * Prefer `legalFlag(iso, key)` for pack-aware checks; this object is the billing mirror.
 */
export const LEGAL_FEATURE_FLAGS = {
  ...LEGAL_FEATURE_FLAGS_OFF,
} as const satisfies Record<LegalFeatureFlagKey, boolean>

export type LegalFeatureFlag = LegalFeatureFlagKey

export function isLegalFeatureEnabled(flag: LegalFeatureFlag): boolean {
  return LEGAL_FEATURE_FLAGS[flag] === true
}

/**
 * Billing-only permanent locks (not in CountryPack catalog — never toggleable).
 * Canada tenant card fee: RTA s134; Quebec card surcharge prohibited.
 */
export const BILLING_PERMANENT_OFF_FLAGS = {
  tenantCardConvenienceFee: false,
  quebecCardSurcharge: false,
  platformFundPooling: false,
} as const

/** @deprecated use BILLING_PERMANENT_OFF_FLAGS */
export const PERMANENTLY_OFF_FLAGS = [
  "tenantCardConvenienceFee",
  "quebecCardSurcharge",
] as const

/**
 * Reserved host pay rails (prefs) — OFF until Aloke/ops turn on.
 * Names aligned for Admin compliance console (`in-pay` / `ca-pay`).
 */
export const RESERVED_HOST_PAY_FLAGS = {
  "in-pay": false,
  "ca-pay": false,
} as const

export const D13_LEGAL_WORDING =
  "Telangana and Ontario selected; synthetic demos allowed; production gated by feature."

export const ALOKE_ENTITY_NAMES = {
  canada: DESKULPT_CANADA_LEGAL_NAME,
  canadaJurisdiction: "federal_canada" as const,
  /** From Aloke PRD checklist — GST/HST # item resolved */
  canadaGstHstNumber: DESKULPT_CANADA_GST_HST_NUMBER,
  canadaGstHstNumberResolved: true,
  india: "Deskulpt Commerce India Pvt Ltd" as const,
  indianCaLawyersEngaged: false,
} as const

export const ALOKE_INDIAN_ENTITY_DECISION = {
  indianEntityWillRegister: true,
  plannedForm: "in_pvt_ltd_subsidiary" as const,
  legalName: "Deskulpt Commerce India Pvt Ltd" as const,
  razorpayInPrincipleAcceptanceFirst: true,
  razorpayMerchantAccount: "indian_entity" as const,
  canadaSubscriptions: "stripe" as const,
  canadaLegalName: "Deskulpt Inc" as const,
  incorporatingDoesNotEqualRouteEligibility: true,
  /** Aloke recorded Approve with advisors' changes — not fully approved; gates OFF */
  alokeApproveWithAdvisorsChanges: {
    D11: true,
    D12: true,
    D13: true,
    D15: true,
  } as const,
  fullyApprovedD11D12D13D15: false,
  labelledDemo: true as const,
}

/** Aloke AI path — real PII still blocked until data-handling review. */
export const ALOKE_AI_STACK = {
  gateway: "cloudflare_ai_gateway" as const,
  inference: "workers_ai_free" as const,
  dailyNeuronLimits: true,
  realPiiBlockedUntilDataHandlingReview: true,
  labelledDemo: true as const,
}

export type RouteDepositGateId =
  | "indian_entity_exists"
  | "razorpay_written_acceptance"
  | "legal_signoff"

export type RouteDepositGateResult = {
  gates: Record<RouteDepositGateId, boolean>
  routeSplitsAllowed: false | true
  depositHoldsAllowed: false | true
  blockers: string[]
  labelledDemo: true
}

function envFlag(name: string): boolean {
  return process.env[name] === "1"
}

/**
 * Route / deposit holds — OFF until entity + Razorpay **written approval** + Legal.
 * Incorporating alone does not unlock Route. Uses canonical `routeHolds` / `depositHolds`.
 */
export function evaluateRouteDepositGates(
  overrides?: Partial<Record<RouteDepositGateId, boolean>>,
): RouteDepositGateResult {
  const gates: Record<RouteDepositGateId, boolean> = {
    indian_entity_exists: overrides?.indian_entity_exists ?? envFlag("IN_ENTITY_EXISTS"),
    razorpay_written_acceptance:
      overrides?.razorpay_written_acceptance ?? envFlag("RAZORPAY_ACCEPTANCE"),
    legal_signoff: overrides?.legal_signoff ?? envFlag("LEGAL_ROUTE_DEPOSIT_SIGNOFF"),
  }
  const labels: Record<RouteDepositGateId, string> = {
    indian_entity_exists: "IN Pvt Ltd subsidiary exists",
    razorpay_written_acceptance: "Razorpay written in-principle / Route approval on file",
    legal_signoff: "Legal sign-off for Route/deposit holds",
  }
  const blockers = (Object.keys(gates) as RouteDepositGateId[])
    .filter((k) => !gates[k])
    .map((k) => labels[k])
  const all = blockers.length === 0
  return {
    gates,
    routeSplitsAllowed: (all && LEGAL_FEATURE_FLAGS.routeHolds) as false | true,
    depositHoldsAllowed: (all && LEGAL_FEATURE_FLAGS.depositHolds) as false | true,
    blockers,
    labelledDemo: true,
  }
}

export function razorpayRouteRuntimeAllowed(): boolean {
  return evaluateRouteDepositGates().routeSplitsAllowed === true
}

export function depositHoldsRuntimeAllowed(): boolean {
  return evaluateRouteDepositGates().depositHoldsAllowed === true
}

/** Legal Ontario commission — design/test only until live gates clear. */
export const ONTARIO_COMMISSION_LEGAL = {
  status: "approve_with_changes_design_test_only" as const,
  live: false,
  landlordPaidPercentRange: [100, 200] as const,
  landlordPaidPercentMin: 1,
  landlordPaidPercentMax: 2,
  requiresExpressLandlordServiceDeductionAgreement: true,
  creditTenantFullRentPaid: true,
  tenantCardConvenienceFee: "permanently_off_rta_s134" as const,
  padOptionalNeverMandatory: true,
  paymentsCanadaRuleH1: true,
  stripeCustomerNotBocOrFintracExemptionAuto: true,
  deskulptSpecificAssessmentBeforeLive: true,
  connectAppFeeDoesNotCalcHst: true,
  computeAndRemitHstOurselves: true,
  quebecCardSurchargesProhibited: true,
  beforeLive: [
    "funds_flow_diagram_and_contracts",
    "stripe_use_case_acceptance",
    "ontario_counsel",
    "cpa",
  ] as const,
  labelledDemo: true as const,
}

export const LEGAL_CFO_RENT_RAIL_CONFLICT = {
  status: "OPEN" as const,
  legalPosition: "Canadian Stripe may support UPI — needs verify with Stripe",
  cfoPosition: "Rent on landlord-owned Razorpay/UPI; Deskulpt never touches rent without gated Route",
  alokeIndiaPath:
    "Plan IN Pvt Ltd; Razorpay written in-principle first; Route/deposits OFF until written approval",
  codeFollows: "aloke_indian_entity_razorpay_design_flags_off" as const,
}

/**
 * Legal / Aloke feature-flag defaults (DEMO).
 * Conditional Legal advisory only — not licensed go-live auth.
 * D11/D12/D13/D15 Aloke Approve with advisors' changes — not fully approved; gates OFF.
 */

import {
  DESKULPT_CANADA_GST_HST_NUMBER,
  DESKULPT_CANADA_LEGAL_NAME,
} from "@/lib/billing/tax-identity"

export const LEGAL_FEATURE_FLAGS = {
  /** IN Route rent splits — OFF until entity + Razorpay written approval + Legal */
  routeRentSplits: false,
  platformFundPooling: false,
  /** Deposit holds — OFF until same gates / written approval */
  depositHoldsOnDeskulpt: false,
  /**
   * Tenant card convenience fee — **permanently OFF** (RTA s134; no safe harbour).
   * Do not enable for Ontario residential.
   */
  tenantCardConvenienceFee: false,
  /** Quebec card surcharges prohibited — keep OFF in QC */
  quebecCardSurcharge: false,
  mandatoryTenantSurcharges: false,
  /**
   * Ontario Connect DIRECT + PAD — Legal AwC = **design/test only, not live**.
   * Before live: funds-flow diagram+contracts; Stripe use-case acceptance; ON counsel + CPA.
   */
  ontarioConnectDirectPad: false,
  eStoreLive: false,
  conciergeLive: false,
  affiliateLive: false,
  realPiiAiConnectorsMedia: false,
} as const

export type LegalFeatureFlag = keyof typeof LEGAL_FEATURE_FLAGS

export function isLegalFeatureEnabled(flag: LegalFeatureFlag): boolean {
  return LEGAL_FEATURE_FLAGS[flag]
}

/** Permanently denied — not a gate that can turn on via env. */
export const PERMANENTLY_OFF_FLAGS = [
  "tenantCardConvenienceFee",
  "quebecCardSurcharge",
] as const satisfies ReadonlyArray<LegalFeatureFlag>

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
 * Incorporating alone does not unlock Route.
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
    routeSplitsAllowed: (all && LEGAL_FEATURE_FLAGS.routeRentSplits) as false | true,
    depositHoldsAllowed: (all && LEGAL_FEATURE_FLAGS.depositHoldsOnDeskulpt) as false | true,
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
  landlordPaidPercentRange: [100, 200] as const, // 1–2% in bps-of-100? store as 1-2 percent
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

/**
 * Legal / Aloke feature-flag defaults (DEMO).
 * Route splits + deposit holds: OFF until ALL gates pass.
 * Conditional Legal advisory only — not go-live auth.
 * D11/D12/D13/D15 are NOT Aloke-approved.
 */

export const LEGAL_FEATURE_FLAGS = {
  /** Route rent splits / linked accounts — OFF until entity + Razorpay acceptance + Legal */
  routeRentSplits: false,
  platformFundPooling: false,
  /** Deposit holds on Deskulpt/IN entity books — OFF until same three gates */
  depositHoldsOnDeskulpt: false,
  mandatoryTenantSurcharges: false,
  /**
   * Ontario Stripe Connect DIRECT + PAD rent collection.
   * Finance D11 AwC documented; Legal ON tenant-fee / provider-reg **pending** → OFF.
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

/** Canonical D13 Legal wording (AwC). */
export const D13_LEGAL_WORDING =
  "Telangana and Ontario selected; synthetic demos allowed; production gated by feature."

/**
 * Aloke decision (owner direction — NOT Aloke Approve on D11/D13):
 * Indian entity will be registered for Razorpay.
 * Razorpay integration keyed to Indian-entity merchant account.
 * Stripe remains Deskulpt Canada subscriptions.
 */
export const ALOKE_INDIAN_ENTITY_DECISION = {
  indianEntityWillRegister: true,
  razorpayMerchantAccount: "indian_entity" as const,
  canadaSubscriptions: "stripe" as const,
  /** Not an Aloke Approve of D11/D12/D13/D15 */
  alokeApproveD11D12D13D15: false,
  labelledDemo: true as const,
}

/**
 * Gates before Route splits or deposit holds may turn ON.
 * All three required (Aloke + Legal).
 */
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
 * Evaluate Route / deposit-hold readiness.
 * Defaults fail-closed. Ops may set IN_ENTITY_EXISTS=1, RAZORPAY_ACCEPTANCE=1, LEGAL_ROUTE_DEPOSIT_SIGNOFF=1
 * only after real evidence — never from demos.
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
    indian_entity_exists: "Indian entity registered and exists",
    razorpay_written_acceptance: "Razorpay written acceptance on file",
    legal_signoff: "Legal sign-off for Route/deposit holds",
  }
  const blockers = (Object.keys(gates) as RouteDepositGateId[])
    .filter((k) => !gates[k])
    .map((k) => labels[k])
  const all = blockers.length === 0
  return {
    gates,
    // Even when gates pass, compile-time catalogue flags stay false until explicitly flipped in code review.
    // Runtime allow only if gates pass AND catalogue flag would be enabled — catalogue remains false today.
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

/**
 * OPEN Legal ↔ CFO on whether CA Stripe UPI could collect rent.
 * Aloke path for India: Indian-entity Razorpay (not CA Stripe UPI for IN rent).
 * Stripe remains Canada subscriptions. Conflict on CA rent rails still OPEN if Stripe UPI verified.
 */
export const LEGAL_CFO_RENT_RAIL_CONFLICT = {
  status: "OPEN" as const,
  legalPosition: "Canadian Stripe may support UPI — needs verify with Stripe",
  cfoPosition: "Rent on landlord-owned Razorpay/UPI; Deskulpt never touches rent without gated Route",
  alokeIndiaPath: "Register Indian entity; Razorpay keyed to Indian-entity merchant; Route/deposits flagged OFF until 3 gates",
  codeFollows: "aloke_indian_entity_razorpay_design_flags_off" as const,
}

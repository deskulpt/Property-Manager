/**
 * Legal feature-flag defaults (D10/D11/D12 — DEMO).
 * OFF until written Razorpay acceptance + specialist review.
 * Conditional Legal advisory only — not go-live auth.
 */

export const LEGAL_FEATURE_FLAGS = {
  /** Route rent splits / linked accounts — CFO BLOCKER + Legal OFF */
  routeRentSplits: false,
  platformFundPooling: false,
  depositHoldsOnDeskulpt: false,
  /** Mandatory tenant-paid surcharges — Legal OFF (landlord % surcharge is separate product) */
  mandatoryTenantSurcharges: false,
  eStoreLive: false,
  conciergeLive: false,
  affiliateLive: false,
  /** Real PII into AI / connectors / media until vendor DPA/retention */
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
 * OPEN Legal ↔ CFO conflict on rent rails.
 * Code follows CFO/BM until resolved: landlord-owned Razorpay/UPI; Stripe = subscriptions.
 */
export const LEGAL_CFO_RENT_RAIL_CONFLICT = {
  status: "OPEN" as const,
  legalPosition: "Canadian Stripe may support UPI — needs verify with Stripe",
  cfoPosition: "Rent on landlord-owned Razorpay/UPI; Deskulpt never touches rent; no Route",
  codeFollows: "cfo_bm" as const,
}

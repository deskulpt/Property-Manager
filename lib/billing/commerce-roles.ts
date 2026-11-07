/**
 * Subscription / rent / surcharge commerce model (D11 — NOT Aloke-approved).
 *
 * Aloke BM + CFO (7 Nov):
 * - Subscriptions: Stripe (processor). Deskulpt files/remits tax via Stripe Tax.
 * - Rent: landlord-owned UPI / Razorpay — Deskulpt never touches rent.
 * - NO Razorpay Route / linked accounts / splits (BLOCKER).
 * - Deposits: NEVER held on Deskulpt books (REJECT) — landlord or licensed escrow.
 * - % surcharge: separate Stripe invoice AFTER rent settles — not Route.
 */

export type CommerceRole = "processor" | "mor_legacy_unused" | "demo"

export const PROVIDER_COMMERCE_ROLE = {
  /** Subscription processor — Deskulpt is seller of record for SaaS; Stripe Tax assists */
  stripe: "processor",
  paypal: "processor",
  /** Legacy stub only — not the subscription path */
  dodo: "mor_legacy_unused",
  demo: "demo",
} as const satisfies Record<string, CommerceRole>

export function commerceRoleForProvider(
  name: "dodo" | "paypal" | "stripe" | "demo",
): CommerceRole {
  return PROVIDER_COMMERCE_ROLE[name]
}

/** Canonical subscription processor for Deskulpt SaaS. */
export const SUBSCRIPTION_PROCESSOR = "stripe" as const

export function rentMaySettleOnPlatformBooks(): false {
  return false
}

/** CFO REJECT — Deskulpt must not hold tenant deposits. */
export function deskulptMayHoldDeposits(): false {
  return false
}

/** CFO BLOCKER — never build Route / linked accounts / payment splits. */
export function razorpayRouteAllowed(): false {
  return false
}

export const D11_DOCUMENTED = {
  subscriptionProcessor: "stripe" as const,
  stripeIsMor: false,
  stripeIsProcessor: true,
  deskulptRemitsTaxViaStripeTax: true,
  paypalIsMor: false,
  dodoInSubscriptionPath: false,
  rentThroughDeskulptBooks: false,
  rentRails: ["landlord_upi", "landlord_razorpay"] as const,
  razorpayRoute: false,
  depositsHeldByDeskulpt: false,
  depositHolders: ["landlord", "licensed_escrow"] as const,
  surchargeSeparateStripeInvoice: true,
  commissionsEnabled: false,
  rentCollectionEnabled: false,
  financeApproveWithChanges: true,
  financeConditions: ["no_razorpay_route", "deposits_not_held_by_deskulpt"] as const,
  alokeApproved: false,
  labelledDemo: true as const,
}

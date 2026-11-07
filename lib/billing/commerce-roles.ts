/**
 * Subscription / rent / surcharge commerce model (D11 — NOT Aloke-approved).
 *
 * Aloke decision (owner direction):
 * - Indian entity **will be registered** for Razorpay.
 * - Razorpay integration design keyed to **Indian-entity merchant account**.
 * - Stripe remains Deskulpt **Canada** subscriptions.
 * - Route splits + deposit holds: behind flags, OFF until entity + Razorpay acceptance + Legal sign-off.
 *
 * CFO: no live Route until gates; deposits not held until gates; surcharge = separate Stripe invoice.
 */

import {
  depositHoldsRuntimeAllowed,
  razorpayRouteRuntimeAllowed,
} from "@/lib/billing/legal-flags"

export type CommerceRole = "processor" | "mor_legacy_unused" | "demo"

export const PROVIDER_COMMERCE_ROLE = {
  stripe: "processor",
  paypal: "processor",
  dodo: "mor_legacy_unused",
  demo: "demo",
} as const satisfies Record<string, CommerceRole>

export function commerceRoleForProvider(
  name: "dodo" | "paypal" | "stripe" | "demo",
): CommerceRole {
  return PROVIDER_COMMERCE_ROLE[name]
}

export const SUBSCRIPTION_PROCESSOR = "stripe" as const
export const SUBSCRIPTION_MARKET = "canada_deskulpt" as const
export const RAZORPAY_MERCHANT_SCOPE = "indian_entity" as const

export function rentMaySettleOnPlatformBooks(): boolean {
  // Only if gated Route path ever enabled — today always false via flags.
  return razorpayRouteRuntimeAllowed()
}

export function deskulptMayHoldDeposits(): boolean {
  return depositHoldsRuntimeAllowed()
}

/** Catalogue: Route not allowed until runtime gates + flag flip. */
export function razorpayRouteAllowed(): boolean {
  return razorpayRouteRuntimeAllowed()
}

export const D11_DOCUMENTED = {
  subscriptionProcessor: "stripe" as const,
  subscriptionMarket: "canada" as const,
  stripeIsMor: false,
  stripeIsProcessor: true,
  deskulptRemitsTaxViaStripeTax: true,
  indianEntityWillRegister: true,
  razorpayMerchantAccount: "indian_entity" as const,
  razorpayRoute: false,
  razorpayRouteGate:
    "OFF until indian_entity_exists + razorpay_written_acceptance + legal_signoff" as const,
  depositsHeldByDeskulpt: false,
  depositHoldGate: "OFF until same three gates" as const,
  rentRailsDefault: ["landlord_upi", "landlord_razorpay"] as const,
  surchargeSeparateStripeInvoice: true,
  commissionsEnabled: false,
  rentCollectionEnabled: false,
  financeApproveWithChanges: true,
  financeConditions: ["no_razorpay_route_until_gates", "deposits_not_held_until_gates"] as const,
  alokeApproved: false,
  labelledDemo: true as const,
}

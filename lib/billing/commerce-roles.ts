/**
 * Subscription / rent / surcharge commerce model (D11 — NOT Aloke-approved).
 *
 * Aloke Canada-first (Nov7):
 * - Prefer **Canada Stripe Connect hosted checkout** completeness.
 * - **PARK India money** — Route / Razorpay / in-pay flags OFF for now (forever until unparked).
 * - Stripe remains Deskulpt **Canada** subscriptions + Connect DIRECT+PAD (flag OFF until Legal).
 *
 * CFO: no live Route; deposits not held; surcharge = separate Stripe invoice.
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
  indianLegalName: "Deskulpt Commerce India Pvt Ltd" as const,
  canadaLegalName: "Deskulpt Inc" as const,
  razorpayMerchantAccount: "indian_entity" as const,
  razorpayRoute: false,
  indiaMoneyParked: true as const,
  razorpayRouteGate: "PARKED — India money plane OFF for now" as const,
  depositsHeldByDeskulpt: false,
  depositHoldGate: "PARKED with India money plane" as const,
  /** Ontario Finance AwC — flag OFF until Legal tenant-fee/provider-reg */
  ontario: {
    financeStatus: "approve_with_changes" as const,
    connectChargeType: "direct" as const,
    rentMethod: "pad" as const,
    hostedCheckout: "stripe_connect_hosted" as const,
    deskulptRevenue: "application_fee_only_incl_hst" as const,
    feesToTenants: false,
    reverseFeeOnPadDispute: true,
    monthlyStatementWithGstHstNumber: true,
    featureFlag: "ontarioConnectDirectPad" as const,
    featureFlagEnabled: false,
    legalTenantFeeProviderReg: "pending" as const,
  },
  /** CA-first rent rail; India UPI/Razorpay parked */
  rentRailsDefault: ["landlord_stripe_connect_pad"] as const,
  /** Separate invoice path for markets without Connect (and ON while flag OFF) */
  surchargeSeparateStripeInvoice: true,
  commissionsEnabled: false,
  rentCollectionEnabled: false,
  financeApproveWithChanges: true,
  financeConditions: [
    "no_razorpay_route_until_gates",
    "deposits_not_held_until_gates",
    "ontario_connect_off_until_legal_tenant_fee_provider_reg",
  ] as const,
  alokeApproved: false,
  labelledDemo: true as const,
}

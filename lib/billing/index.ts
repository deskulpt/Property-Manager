import "server-only"
import { demoBillingProvider } from "@/lib/billing/providers/demo"
import { dodoBillingProvider } from "@/lib/billing/providers/dodo"
import { paypalBillingProvider } from "@/lib/billing/providers/paypal"
import { stripeBillingProvider } from "@/lib/billing/providers/stripe"
import {
  resolvePrimaryProviderName,
  resolveProviderNameForPayer,
} from "@/lib/billing/routing"
import type { BillingProviderName, PlatformBillingProvider } from "@/lib/billing/types"

export function getBillingProviderByName(name: BillingProviderName): PlatformBillingProvider {
  switch (name) {
    case "stripe":
      return stripeBillingProvider
    case "demo":
      return demoBillingProvider
    case "paypal":
      return paypalBillingProvider
    case "dodo":
    default:
      return dodoBillingProvider
  }
}

/**
 * Primary subscription processor — Stripe (Aloke BM + CFO).
 * Deskulpt remits tax via Stripe Tax. Swap via BILLING_PROVIDER.
 */
export function resolveBillingProvider(): PlatformBillingProvider {
  const name = resolvePrimaryProviderName()
  if (name === "stripe" && !process.env.STRIPE_SECRET_KEY?.trim() && process.env.BILLING_REQUIRE_KEYS === "1") {
    return demoBillingProvider
  }
  return getBillingProviderByName(name)
}

/** Subscription checkout — Stripe default for all markets (rent is not routed here). */
export function resolveBillingProviderForPayer(
  billingCountry: string | null | undefined,
): PlatformBillingProvider {
  return getBillingProviderByName(resolveProviderNameForPayer(billingCountry))
}

export function billingProviderName(): BillingProviderName {
  return resolveBillingProvider().name
}

export type { PlatformBillingProvider, BillingProviderName }
export * from "@/lib/billing/pricing"
export * from "@/lib/billing/types"
export * from "@/lib/billing/routing"
export * from "@/lib/billing/fx"
export * from "@/lib/billing/tax"
export * from "@/lib/billing/ai-meter"
export * from "@/lib/billing/dual-control"
export * from "@/lib/billing/go-live-gate"
export * from "@/lib/billing/affiliate-terms"
export * from "@/lib/billing/commerce-roles"
export * from "@/lib/billing/surcharge"
export * from "@/lib/billing/legal-flags"
export * from "@/lib/billing/ontario-connect"
export * from "@/lib/billing/ca-connect-checkout"
export * from "@/lib/billing/ca-connect-e2e"
export * from "@/lib/billing/tax-identity"

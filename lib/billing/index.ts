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
 * Primary MoR (India / default). Swap via BILLING_PROVIDER.
 * PayPal is never the primary for domestic IN — use resolveBillingProviderForPayer.
 */
export function resolveBillingProvider(): PlatformBillingProvider {
  const name = resolvePrimaryProviderName()
  if (name === "dodo" && !process.env.DODO_API_KEY?.trim() && process.env.BILLING_REQUIRE_KEYS === "1") {
    return demoBillingProvider
  }
  return getBillingProviderByName(name)
}

/** Route by payer country: IN → primary; elsewhere → BILLING_INTL_PROVIDER (paypal). */
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

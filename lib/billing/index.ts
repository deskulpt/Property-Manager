import "server-only"
import { demoBillingProvider } from "@/lib/billing/providers/demo"
import { dodoBillingProvider } from "@/lib/billing/providers/dodo"
import { stripeBillingProvider } from "@/lib/billing/providers/stripe"
import type { BillingProviderName, PlatformBillingProvider } from "@/lib/billing/types"

/**
 * Select MoR / billing adapter via BILLING_PROVIDER.
 * Default: dodo (preferred). Falls back to demo when keys missing and BILLING_PROVIDER unset in non-strict mode.
 */
export function resolveBillingProvider(): PlatformBillingProvider {
  const raw = (process.env.BILLING_PROVIDER ?? "dodo").trim().toLowerCase()
  const name = (["dodo", "stripe", "demo"].includes(raw) ? raw : "dodo") as BillingProviderName

  if (name === "stripe") return stripeBillingProvider
  if (name === "demo") return demoBillingProvider

  // dodo — use demo checkout path automatically when no API key (test mode).
  if (!process.env.DODO_API_KEY?.trim() && process.env.BILLING_REQUIRE_KEYS === "1") {
    return demoBillingProvider
  }
  return dodoBillingProvider
}

export function billingProviderName(): BillingProviderName {
  return resolveBillingProvider().name
}

export type { PlatformBillingProvider, BillingProviderName }
export * from "@/lib/billing/pricing"
export * from "@/lib/billing/types"

import type { BillingProviderName } from "@/lib/billing/types"

const PROVIDERS: BillingProviderName[] = ["dodo", "stripe", "demo", "paypal"]

export function parseBillingProviderName(
  raw: string | null | undefined,
  fallback: BillingProviderName = "dodo",
): BillingProviderName {
  const name = (raw ?? "").trim().toLowerCase()
  return (PROVIDERS.includes(name as BillingProviderName) ? name : fallback) as BillingProviderName
}

/** ISO 3166-1 alpha-2; empty → IN (domestic default). */
export function normalizeBillingCountry(raw: string | null | undefined): string {
  const c = (raw ?? "").trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(c)) return c
  return "IN"
}

export function isIndiaBillingCountry(country: string | null | undefined): boolean {
  return normalizeBillingCountry(country) === "IN"
}

/**
 * Route checkout:
 * - India (IN) → BILLING_PROVIDER (dodo / stripe / demo) — PayPal does not process domestic IN.
 * - Outside India → BILLING_INTL_PROVIDER (default paypal).
 * Override: BILLING_FORCE_PROVIDER=… for ops / tests.
 */
export function resolveProviderNameForPayer(
  billingCountry: string | null | undefined,
): BillingProviderName {
  const force = process.env.BILLING_FORCE_PROVIDER?.trim()
  if (force) return parseBillingProviderName(force)

  if (isIndiaBillingCountry(billingCountry)) {
    return parseBillingProviderName(process.env.BILLING_PROVIDER, "dodo")
  }
  return parseBillingProviderName(process.env.BILLING_INTL_PROVIDER, "paypal")
}

/** Primary / domestic provider (India path + default webhook fallback). */
export function resolvePrimaryProviderName(): BillingProviderName {
  return parseBillingProviderName(process.env.BILLING_PROVIDER, "dodo")
}

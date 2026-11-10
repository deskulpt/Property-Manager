import type { BillingProviderName } from "@/lib/billing/types"

const PROVIDERS: BillingProviderName[] = ["dodo", "stripe", "demo", "paypal"]

export function parseBillingProviderName(
  raw: string | null | undefined,
  fallback: BillingProviderName = "stripe",
): BillingProviderName {
  const name = (raw ?? "").trim().toLowerCase()
  return (PROVIDERS.includes(name as BillingProviderName) ? name : fallback) as BillingProviderName
}

/** ISO 3166-1 alpha-2; empty → CA (Ontario launch default). */
export function normalizeBillingCountry(raw: string | null | undefined): string {
  const c = (raw ?? "").trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(c)) return c
  return "CA"
}

export function isIndiaBillingCountry(country: string | null | undefined): boolean {
  return normalizeBillingCountry(country) === "IN"
}

/**
 * Subscription checkout routing (Aloke Canada-first):
 * - Default processor: **Stripe** (+ Stripe Tax). Deskulpt remits.
 * - India money plane PARKED — do not special-case Razorpay/Route here.
 * - Rent Connect DIRECT+PAD is separate (`ca-connect-checkout`), flag OFF.
 * Override: BILLING_FORCE_PROVIDER=… for ops / tests.
 */
export function resolveProviderNameForPayer(
  _billingCountry: string | null | undefined,
): BillingProviderName {
  const force = process.env.BILLING_FORCE_PROVIDER?.trim()
  if (force) return parseBillingProviderName(force)

  // Canada-first subscription processor — Stripe (India SaaS MoR path parked)
  return parseBillingProviderName(process.env.BILLING_PROVIDER, "stripe")
}

/** Primary subscription processor (Stripe). */
export function resolvePrimaryProviderName(): BillingProviderName {
  return parseBillingProviderName(process.env.BILLING_PROVIDER, "stripe")
}

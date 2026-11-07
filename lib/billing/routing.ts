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
 * Subscription checkout routing (Aloke BM + CFO 7 Nov):
 * - Default processor: **Stripe** (+ Stripe Tax). Deskulpt remits.
 * - PayPal remains available as alternate processor — never MoR.
 * - Dodo left as legacy stub — not subscription path.
 * - Rent is NOT routed here — landlord UPI/Razorpay only; no Route/splits.
 * Override: BILLING_FORCE_PROVIDER=… for ops / tests.
 */
export function resolveProviderNameForPayer(
  _billingCountry: string | null | undefined,
): BillingProviderName {
  const force = process.env.BILLING_FORCE_PROVIDER?.trim()
  if (force) return parseBillingProviderName(force)

  // Single subscription processor path — Stripe for CA and IN SaaS
  return parseBillingProviderName(process.env.BILLING_PROVIDER, "stripe")
}

/** Primary subscription processor (Stripe). */
export function resolvePrimaryProviderName(): BillingProviderName {
  return parseBillingProviderName(process.env.BILLING_PROVIDER, "stripe")
}

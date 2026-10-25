import type { BillingCadence, BillableSegment, PricingQuote, UnitMix } from "@/lib/billing/pricing"

export type BillingProviderName = "dodo" | "stripe" | "demo"

export type CheckoutSessionInput = {
  tenantId: string
  customerEmail: string
  customerName: string
  mix: UnitMix[]
  cadence: BillingCadence
  quote: PricingQuote
  successUrl: string
  cancelUrl: string
  /** Idempotency / internal subscription draft id */
  clientReferenceId: string
}

export type CheckoutSessionResult = {
  ok: true
  provider: BillingProviderName
  /** Hosted checkout URL (or local demo confirm URL) */
  url: string
  externalSessionId: string
  labelledTestMode: boolean
}

export type WebhookVerifyResult =
  | { ok: true; eventType: string; payload: Record<string, unknown> }
  | { ok: false; error: string }

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "incomplete"

export interface PlatformBillingProvider {
  readonly name: BillingProviderName
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>
  /** Verify signature and parse event. Never trust unsigned bodies. */
  verifyAndParseWebhook(input: {
    rawBody: string
    signatureHeader: string | null
  }): Promise<WebhookVerifyResult>
  /** Test-mode cancel — marks remote subscription canceled when possible. */
  cancelSubscription(input: {
    externalSubscriptionId: string
  }): Promise<{ ok: true; labelledTestMode: boolean } | { ok: false; error: string }>
}

export type BillingSubscriptionRow = {
  id: string
  tenantId: string
  provider: BillingProviderName
  status: SubscriptionStatus
  cadence: BillingCadence
  mixJson: string
  lockedRatesJson: string
  priceLockUntil: string | null
  externalCustomerId: string | null
  externalSubscriptionId: string | null
  externalSessionId: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: number
  createdAt: string
  updatedAt: string
}

export type ParsedMix = UnitMix[]
export type ParsedLockedRates = Partial<Record<BillableSegment, number>>

import "server-only"
import { getDb, countUnits, setTenantPackage } from "@/lib/db"
import {
  FREE_PLAN_MAX_UNITS,
  lockRatesFromQuote,
  priceLockUntilIso,
  quotePlatformBilling,
  type BillingCadence,
  type PricingQuote,
  type UnitMix,
} from "@/lib/billing/pricing"
import { getBillingProviderByName, resolveBillingProviderForPayer } from "@/lib/billing"
import { normalizeBillingCountry } from "@/lib/billing/routing"
import type { BillingProviderName, BillingSubscriptionRow, SubscriptionStatus } from "@/lib/billing/types"

function asRow(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null
  return value as Record<string, unknown>
}

function mapSub(row: Record<string, unknown>): BillingSubscriptionRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    provider: String(row.provider) as BillingProviderName,
    status: String(row.status) as SubscriptionStatus,
    cadence: String(row.cadence) as BillingCadence,
    mixJson: String(row.mix_json),
    lockedRatesJson: String(row.locked_rates_json),
    priceLockUntil: row.price_lock_until ? String(row.price_lock_until) : null,
    externalCustomerId: row.external_customer_id ? String(row.external_customer_id) : null,
    externalSubscriptionId: row.external_subscription_id
      ? String(row.external_subscription_id)
      : null,
    externalSessionId: row.external_session_id ? String(row.external_session_id) : null,
    currentPeriodEnd: row.current_period_end ? String(row.current_period_end) : null,
    cancelAtPeriodEnd: Number(row.cancel_at_period_end) === 1 ? 1 : 0,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function countPayingBillingAccounts(): number {
  const row = asRow(
    getDb()
      .prepare(
        `SELECT COUNT(DISTINCT tenant_id) AS c FROM billing_subscriptions
         WHERE status IN ('active', 'trialing', 'past_due')`,
      )
      .get(),
  )
  return Number(row?.c ?? 0)
}

export function getActiveBillingSubscription(tenantId: string): BillingSubscriptionRow | null {
  const row = asRow(
    getDb()
      .prepare(
        `SELECT * FROM billing_subscriptions
         WHERE tenant_id = ? AND status IN ('active', 'trialing', 'past_due')
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(tenantId),
  )
  return row ? mapSub(row) : null
}

export function getBillingSubscriptionById(id: string): BillingSubscriptionRow | null {
  const row = asRow(getDb().prepare("SELECT * FROM billing_subscriptions WHERE id = ?").get(id))
  return row ? mapSub(row) : null
}

export function listBillingSubscriptions(tenantId: string): BillingSubscriptionRow[] {
  return (
    getDb()
      .prepare(`SELECT * FROM billing_subscriptions WHERE tenant_id = ? ORDER BY created_at DESC`)
      .all(tenantId) as Record<string, unknown>[]
  ).map(mapSub)
}

/** Free plan: max 1 unit org-wide until an active paid subscription exists. */
export function canAddUnitUnderBilling(tenantId: string): {
  ok: true
  used: number
  max: number | null
} | {
  ok: false
  error: string
  used: number
  max: number
} {
  const used = countUnits(tenantId)
  const paid = getActiveBillingSubscription(tenantId)
  if (paid) {
    return { ok: true, used, max: null }
  }
  if (used >= FREE_PLAN_MAX_UNITS) {
    return {
      ok: false,
      error: `Free plan includes ${FREE_PLAN_MAX_UNITS} unit. Upgrade on Billing to add more.`,
      used,
      max: FREE_PLAN_MAX_UNITS,
    }
  }
  return { ok: true, used, max: FREE_PLAN_MAX_UNITS }
}

export function quoteForTenant(
  tenantId: string,
  mix: UnitMix[],
  cadence: BillingCadence,
  nowMs = Date.now(),
): PricingQuote {
  const existing = getActiveBillingSubscription(tenantId)
  let locked: Partial<Record<import("@/lib/billing/pricing").BillableSegment, number>> | null =
    null
  let lockUntil: string | null = null
  if (existing?.priceLockUntil && Date.parse(existing.priceLockUntil) > nowMs) {
    try {
      locked = JSON.parse(existing.lockedRatesJson) as typeof locked
      lockUntil = existing.priceLockUntil
    } catch {
      locked = null
    }
  }
  return quotePlatformBilling({
    mix,
    cadence,
    nowMs,
    payingAccountCount: countPayingBillingAccounts(),
    lockedMonthlyPaise: locked,
    priceLockUntilIso: lockUntil,
  })
}

export async function startBillingCheckout(input: {
  tenantId: string
  email: string
  name: string
  mix: UnitMix[]
  cadence: BillingCadence
  successUrl: string
  cancelUrl: string
  /** ISO country — IN uses primary MoR; others may route to PayPal */
  billingCountry?: string | null
}) {
  const quote = quoteForTenant(input.tenantId, input.mix, input.cadence)
  if (quote.units < 1) {
    return { ok: false as const, error: "Add at least one unit to the mix." }
  }
  const billingCountry = normalizeBillingCountry(input.billingCountry)
  const provider = resolveBillingProviderForPayer(billingCountry)
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const locked = lockRatesFromQuote(quote)
  const lockUntil = priceLockUntilIso(Date.now())
  getDb()
    .prepare(
      `INSERT INTO billing_subscriptions (
        id, tenant_id, provider, status, cadence, mix_json, locked_rates_json, price_lock_until,
        external_customer_id, external_subscription_id, external_session_id, current_period_end,
        cancel_at_period_end, created_at, updated_at
      ) VALUES (?, ?, ?, 'incomplete', ?, ?, ?, ?, NULL, NULL, NULL, NULL, 0, ?, ?)`,
    )
    .run(
      id,
      input.tenantId,
      provider.name,
      input.cadence,
      JSON.stringify(input.mix),
      JSON.stringify(locked),
      lockUntil,
      now,
      now,
    )

  const session = await provider.createCheckoutSession({
    tenantId: input.tenantId,
    customerEmail: input.email,
    customerName: input.name,
    mix: input.mix,
    cadence: input.cadence,
    quote,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    clientReferenceId: id,
    billingCountry,
  })

  getDb()
    .prepare(
      `UPDATE billing_subscriptions SET external_session_id = ?, provider = ?, updated_at = ? WHERE id = ?`,
    )
    .run(session.externalSessionId, session.provider, new Date().toISOString(), id)

  return {
    ok: true as const,
    checkoutUrl: session.url,
    subscriptionId: id,
    quote,
    session,
    billingCountry,
    provider: session.provider,
  }
}

export function activateBillingSubscription(input: {
  subscriptionId: string
  externalSubscriptionId?: string | null
  externalCustomerId?: string | null
}) {
  const sub = getBillingSubscriptionById(input.subscriptionId)
  if (!sub) return { ok: false as const, error: "Subscription not found." }
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `UPDATE billing_subscriptions SET
         status = 'active',
         external_subscription_id = COALESCE(?, external_subscription_id),
         external_customer_id = COALESCE(?, external_customer_id),
         updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.externalSubscriptionId ?? null,
      input.externalCustomerId ?? null,
      now,
      input.subscriptionId,
    )
  // Paying orgs unlock Growth feature gates by default (Ask Easy still Pro).
  setTenantPackage(sub.tenantId, "growth")
  recordBillingEvent({
    provider: sub.provider,
    eventType: "subscription.activated",
    externalId: input.externalSubscriptionId ?? sub.externalSessionId,
    payload: { subscriptionId: sub.id, tenantId: sub.tenantId },
  })
  return { ok: true as const }
}

export async function cancelBillingSubscription(tenantId: string) {
  const sub = getActiveBillingSubscription(tenantId)
  if (!sub) return { ok: false as const, error: "No active subscription to cancel." }
  const provider = getBillingProviderByName(sub.provider)
  if (sub.externalSubscriptionId) {
    const remote = await provider.cancelSubscription({
      externalSubscriptionId: sub.externalSubscriptionId,
    })
    if (!remote.ok) return remote
  }
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `UPDATE billing_subscriptions SET status = 'canceled', cancel_at_period_end = 0, updated_at = ? WHERE id = ?`,
    )
    .run(now, sub.id)
  setTenantPackage(tenantId, "starter")
  recordBillingEvent({
    provider: sub.provider,
    eventType: "subscription.canceled",
    externalId: sub.externalSubscriptionId,
    payload: { subscriptionId: sub.id, tenantId },
  })
  return { ok: true as const }
}

export function recordBillingEvent(input: {
  provider: string
  eventType: string
  externalId?: string | null
  payload: Record<string, unknown>
}) {
  getDb()
    .prepare(
      `INSERT INTO billing_events (id, provider, event_type, external_id, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      crypto.randomUUID(),
      input.provider,
      input.eventType,
      input.externalId ?? null,
      JSON.stringify(input.payload),
      new Date().toISOString(),
    )
}

export function createKycSessionRow(input: {
  id: string
  userId: string
  provider: string
  status: string
  providerRef?: string | null
  redirectUrl?: string | null
  consentVersion: string
}) {
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO kyc_sessions (
        id, user_id, provider, status, provider_ref, redirect_url, consent_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.userId,
      input.provider,
      input.status,
      input.providerRef ?? null,
      input.redirectUrl ?? null,
      input.consentVersion,
      now,
      now,
    )
}

export function updateKycSession(
  id: string,
  patch: { status: string; providerRef?: string | null },
) {
  getDb()
    .prepare(
      `UPDATE kyc_sessions SET status = ?, provider_ref = COALESCE(?, provider_ref), updated_at = ? WHERE id = ?`,
    )
    .run(patch.status, patch.providerRef ?? null, new Date().toISOString(), id)
}

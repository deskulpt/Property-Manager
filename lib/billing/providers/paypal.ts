import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"
import {
  convertInrPaiseToForeignMinor,
  formatForeignMinor,
  paypalSettlementCurrency,
} from "@/lib/billing/fx"
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  PlatformBillingProvider,
} from "@/lib/billing/types"

/**
 * PayPal Subscriptions — sandbox only (Deskulpt Inc Canadian business account).
 * No live keys in this build: env vars only; checkout is test-shaped until CLIENT_ID is set.
 * Offer only to non-India payers (see lib/billing/routing.ts).
 */
const SANDBOX_API = "https://api-m.sandbox.paypal.com"

function paypalWebhookSecret(): string | null {
  return process.env.PAYPAL_WEBHOOK_SECRET?.trim() || null
}

function paypalWebhookId(): string {
  return process.env.PAYPAL_WEBHOOK_ID?.trim() || "sandbox-webhook"
}

/** Always sandbox host — PAYPAL_LIVE is ignored for API base in this slice. */
export function paypalApiBase(): string {
  void process.env.PAYPAL_LIVE
  return process.env.PAYPAL_API_BASE?.trim() || SANDBOX_API
}

export const paypalBillingProvider: PlatformBillingProvider = {
  name: "paypal",

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const currency = paypalSettlementCurrency()
    const amountMinor = convertInrPaiseToForeignMinor(input.quote.totalInclusivePaise, currency)
    const externalSessionId = `paypal_sandbox_${input.clientReferenceId}`
    const clientId = process.env.PAYPAL_CLIENT_ID?.trim()
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim()

    // Sandbox stub: no live Subscriptions create until keys + product/plan IDs exist.
    if (!clientId || !clientSecret) {
      const url =
        `/landlord/billing/confirm?session=${encodeURIComponent(externalSessionId)}` +
        `&ref=${encodeURIComponent(input.clientReferenceId)}&provider=paypal` +
        `&currency=${currency}&amount=${amountMinor}`
      return {
        ok: true,
        provider: "paypal",
        url,
        externalSessionId,
        labelledTestMode: true,
        settlementCurrency: currency,
        settlementAmountMinor: amountMinor,
        settlementLabel: formatForeignMinor(amountMinor, currency),
      }
    }

    // Keys present but still sandbox-only: do not call live PayPal; keep in-app confirm.
    // Future: POST `${paypalApiBase()}/v1/billing/subscriptions` with plan_id from env.
    void paypalApiBase()
    const url =
      `/landlord/billing/confirm?session=${encodeURIComponent(externalSessionId)}` +
      `&ref=${encodeURIComponent(input.clientReferenceId)}&provider=paypal` +
      `&currency=${currency}&amount=${amountMinor}`
    return {
      ok: true,
      provider: "paypal",
      url,
      externalSessionId,
      labelledTestMode: true,
      settlementCurrency: currency,
      settlementAmountMinor: amountMinor,
      settlementLabel: formatForeignMinor(amountMinor, currency),
    }
  },

  async verifyAndParseWebhook({ rawBody, signatureHeader }) {
    const secret = paypalWebhookSecret()
    if (!secret) {
      return { ok: false, error: "PAYPAL_WEBHOOK_SECRET is not configured." }
    }
    if (!signatureHeader) {
      return { ok: false, error: "Missing PayPal transmission signature header." }
    }

    // Sandbox stand-in for PayPal's cert-based verify-webhook-signature:
    // HMAC-SHA256(webhookId + '.' + rawBody) hex, compared to paypal-transmission-sig / x-paypal-signature.
    const expected = createHmac("sha256", secret)
      .update(`${paypalWebhookId()}.${rawBody}`)
      .digest("hex")
    const provided = signatureHeader.replace(/^sha256=/i, "").trim()
    try {
      const a = Buffer.from(expected)
      const b = Buffer.from(provided)
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return { ok: false, error: "Invalid PayPal webhook signature." }
      }
    } catch {
      return { ok: false, error: "Invalid PayPal webhook signature." }
    }

    try {
      const payload = JSON.parse(rawBody) as Record<string, unknown>
      const eventType = String(
        payload.event_type ?? payload.eventType ?? payload.type ?? "BILLING.SUBSCRIPTION.ACTIVATED",
      )
      const resource =
        payload.resource && typeof payload.resource === "object"
          ? (payload.resource as Record<string, unknown>)
          : {}
      return {
        ok: true,
        eventType,
        payload: {
          ...payload,
          clientReferenceId: String(
            resource.custom_id ??
              resource.customId ??
              payload.clientReferenceId ??
              payload.client_reference_id ??
              "",
          ),
          subscription_id: String(resource.id ?? payload.subscription_id ?? ""),
          customer_id: String(
            (resource.subscriber as { payer_id?: string } | undefined)?.payer_id ??
              payload.customer_id ??
              "",
          ),
        },
      }
    } catch {
      return { ok: false, error: "Invalid JSON body." }
    }
  },

  async cancelSubscription({ externalSubscriptionId }) {
    void externalSubscriptionId
    // Sandbox: mark canceled locally; live cancel would DELETE/POST cancel on Subscriptions API.
    return { ok: true, labelledTestMode: true }
  },
}

/** Test helper: build the sandbox HMAC transmission signature. */
export function signPaypalSandboxWebhook(rawBody: string, secret: string, webhookId?: string): string {
  const id = webhookId ?? paypalWebhookId()
  return createHmac("sha256", secret).update(`${id}.${rawBody}`).digest("hex")
}

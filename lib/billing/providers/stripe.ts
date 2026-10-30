import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  PlatformBillingProvider,
} from "@/lib/billing/types"

/**
 * Stripe adapter stub — swap via BILLING_PROVIDER=stripe.
 * Test mode only; no live Stripe SDK dependency in this slice.
 */
export const stripeBillingProvider: PlatformBillingProvider = {
  name: "stripe",
  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const externalSessionId = `cs_test_${input.clientReferenceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`
    const url = `/landlord/billing/confirm?session=${encodeURIComponent(externalSessionId)}&ref=${encodeURIComponent(input.clientReferenceId)}&provider=stripe`
    return {
      ok: true,
      provider: "stripe",
      url,
      externalSessionId,
      labelledTestMode: true,
    }
  },

  async verifyAndParseWebhook({ rawBody, signatureHeader }) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
    if (!secret) {
      return { ok: false, error: "STRIPE_WEBHOOK_SECRET is not configured." }
    }
    if (!signatureHeader) {
      return { ok: false, error: "Missing Stripe-Signature header." }
    }
    // Simplified Stripe-style HMAC of body (not full Stripe signed-payload format).
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
    const match = /v1=([a-f0-9]+)/i.exec(signatureHeader)
    const provided = match?.[1] ?? signatureHeader.trim()
    try {
      const a = Buffer.from(expected)
      const b = Buffer.from(provided)
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return { ok: false, error: "Invalid Stripe webhook signature." }
      }
    } catch {
      return { ok: false, error: "Invalid Stripe webhook signature." }
    }
    try {
      const payload = JSON.parse(rawBody) as Record<string, unknown>
      const eventType = String(payload.type ?? "checkout.session.completed")
      return { ok: true, eventType, payload }
    } catch {
      return { ok: false, error: "Invalid JSON body." }
    }
  },

  async cancelSubscription() {
    return { ok: true, labelledTestMode: true }
  },
}

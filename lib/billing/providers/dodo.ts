import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  PlatformBillingProvider,
} from "@/lib/billing/types"

/**
 * Dodo Payments — preferred merchant-of-record adapter.
 * Test mode only in this slice: builds a checkout URL shape and verifies HMAC webhooks.
 * Does not call live Dodo HTTP unless DODO_API_KEY + DODO_LIVE=1 (still stubbed — no live keys).
 */
function dodoSecret(): string | null {
  return process.env.DODO_WEBHOOK_SECRET?.trim() || process.env.DODO_API_KEY?.trim() || null
}

export const dodoBillingProvider: PlatformBillingProvider = {
  name: "dodo",
  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const apiKey = process.env.DODO_API_KEY?.trim()
    const live = process.env.DODO_LIVE === "1"
    const externalSessionId = `dodo_test_${input.clientReferenceId}`

    // Live HTTP intentionally not wired — test mode returns an in-app confirm URL.
    if (!apiKey || !live) {
      const url = `/landlord/billing/confirm?session=${encodeURIComponent(externalSessionId)}&ref=${encodeURIComponent(input.clientReferenceId)}&provider=dodo`
      return {
        ok: true,
        provider: "dodo",
        url,
        externalSessionId,
        labelledTestMode: true,
      }
    }

    // Placeholder for future live create-session call (never executed without DODO_LIVE=1).
    void input
    return {
      ok: true,
      provider: "dodo",
      url: `/landlord/billing/confirm?session=${encodeURIComponent(externalSessionId)}&ref=${encodeURIComponent(input.clientReferenceId)}&provider=dodo`,
      externalSessionId,
      labelledTestMode: false,
    }
  },

  async verifyAndParseWebhook({ rawBody, signatureHeader }) {
    const secret = dodoSecret()
    if (!secret) {
      return { ok: false, error: "DODO_WEBHOOK_SECRET (or DODO_API_KEY) is not configured." }
    }
    if (!signatureHeader) {
      return { ok: false, error: "Missing Dodo signature header." }
    }
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
    const provided = signatureHeader.replace(/^sha256=/i, "").trim()
    try {
      const a = Buffer.from(expected)
      const b = Buffer.from(provided)
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return { ok: false, error: "Invalid Dodo webhook signature." }
      }
    } catch {
      return { ok: false, error: "Invalid Dodo webhook signature." }
    }
    try {
      const payload = JSON.parse(rawBody) as Record<string, unknown>
      const eventType = String(payload.eventType ?? payload.type ?? "checkout.session.completed")
      return { ok: true, eventType, payload }
    } catch {
      return { ok: false, error: "Invalid JSON body." }
    }
  },

  async cancelSubscription({ externalSubscriptionId }) {
    void externalSubscriptionId
    return { ok: true, labelledTestMode: process.env.DODO_LIVE !== "1" }
  },
}

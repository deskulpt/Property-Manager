import "server-only"
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  PlatformBillingProvider,
} from "@/lib/billing/types"

/** Local adapter — no network. Used when BILLING_PROVIDER=demo or keys missing. */
export const demoBillingProvider: PlatformBillingProvider = {
  name: "demo",
  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const externalSessionId = `demo_sess_${input.clientReferenceId}`
    const url = `/landlord/billing/confirm?session=${encodeURIComponent(externalSessionId)}&ref=${encodeURIComponent(input.clientReferenceId)}`
    return {
      ok: true,
      provider: "demo",
      url,
      externalSessionId,
      labelledTestMode: true,
    }
  },
  async verifyAndParseWebhook({ rawBody, signatureHeader }) {
    // Demo accepts unsigned JSON with eventType for local tests only.
    if (process.env.NODE_ENV === "production" && process.env.BILLING_ALLOW_DEMO_WEBHOOK !== "1") {
      return { ok: false, error: "Demo webhooks disabled in production." }
    }
    try {
      const payload = JSON.parse(rawBody) as Record<string, unknown>
      const eventType = String(payload.eventType ?? payload.type ?? "checkout.completed")
      return { ok: true, eventType, payload: { ...payload, _sig: signatureHeader } }
    } catch {
      return { ok: false, error: "Invalid JSON body." }
    }
  },
  async cancelSubscription() {
    return { ok: true, labelledTestMode: true }
  },
}

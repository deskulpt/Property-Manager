import { getBillingProviderByName, resolveBillingProvider } from "@/lib/billing"
import {
  activateBillingSubscription,
  getBillingSubscriptionById,
  recordBillingEvent,
} from "@/lib/billing/store"
import type { BillingProviderName } from "@/lib/billing/types"

export const dynamic = "force-dynamic"

function detectWebhookProvider(request: Request): BillingProviderName {
  const q = new URL(request.url).searchParams.get("provider")?.trim().toLowerCase()
  if (q === "paypal" || q === "stripe" || q === "dodo" || q === "demo") return q

  if (request.headers.get("paypal-transmission-sig") || request.headers.get("x-paypal-signature")) {
    return "paypal"
  }
  if (request.headers.get("stripe-signature")) return "stripe"
  if (request.headers.get("x-dodo-signature")) return "dodo"
  return resolveBillingProvider().name
}

function signatureForProvider(request: Request, provider: BillingProviderName): string | null {
  if (provider === "paypal") {
    return (
      request.headers.get("paypal-transmission-sig") ||
      request.headers.get("x-paypal-signature")
    )
  }
  if (provider === "stripe") return request.headers.get("stripe-signature")
  if (provider === "dodo") {
    return request.headers.get("x-dodo-signature") || request.headers.get("x-signature")
  }
  return request.headers.get("x-signature")
}

/** Platform billing webhooks (Dodo / Stripe / PayPal / demo). Signature verified per provider. */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const providerName = detectWebhookProvider(request)
  const provider = getBillingProviderByName(providerName)
  const verified = await provider.verifyAndParseWebhook({
    rawBody,
    signatureHeader: signatureForProvider(request, providerName),
  })
  if (!verified.ok) {
    return Response.json({ ok: false, error: verified.error }, { status: 401 })
  }

  recordBillingEvent({
    provider: provider.name,
    eventType: verified.eventType,
    externalId: String(verified.payload.id ?? verified.payload.session_id ?? ""),
    payload: verified.payload,
  })

  const ref = String(
    verified.payload.clientReferenceId ??
      verified.payload.client_reference_id ??
      verified.payload.subscriptionId ??
      "",
  )
  const completed =
    /checkout\.(session\.)?completed|subscription\.(activated|created)|BILLING\.SUBSCRIPTION\.(ACTIVATED|CREATED)/i.test(
      verified.eventType,
    ) ||
    verified.payload.status === "paid" ||
    verified.payload.status === "active"

  if (completed && ref) {
    const sub = getBillingSubscriptionById(ref)
    if (sub && sub.status !== "active") {
      activateBillingSubscription({
        subscriptionId: ref,
        externalSubscriptionId: String(
          verified.payload.subscription ??
            verified.payload.subscription_id ??
            ref,
        ),
        externalCustomerId: String(
          verified.payload.customer ?? verified.payload.customer_id ?? "",
        ),
      })
    }
  }

  return Response.json({ ok: true, received: verified.eventType, provider: provider.name })
}

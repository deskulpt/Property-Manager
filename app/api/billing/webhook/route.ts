import { resolveBillingProvider } from "@/lib/billing"
import {
  activateBillingSubscription,
  getBillingSubscriptionById,
  recordBillingEvent,
} from "@/lib/billing/store"

export const dynamic = "force-dynamic"

/** Platform billing webhooks (Dodo / Stripe / demo). Signature verified by the active provider. */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature =
    request.headers.get("x-dodo-signature") ||
    request.headers.get("stripe-signature") ||
    request.headers.get("x-signature")

  const provider = resolveBillingProvider()
  const verified = await provider.verifyAndParseWebhook({
    rawBody,
    signatureHeader: signature,
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
    /checkout\.(session\.)?completed|subscription\.(activated|created)/i.test(verified.eventType) ||
    verified.payload.status === "paid" ||
    verified.payload.status === "active"

  if (completed && ref) {
    const sub = getBillingSubscriptionById(ref)
    if (sub && sub.status !== "active") {
      activateBillingSubscription({
        subscriptionId: ref,
        externalSubscriptionId: String(
          verified.payload.subscription ?? verified.payload.subscription_id ?? ref,
        ),
        externalCustomerId: String(verified.payload.customer ?? verified.payload.customer_id ?? ""),
      })
    }
  }

  return Response.json({ ok: true, received: verified.eventType })
}

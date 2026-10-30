import { resolveKycProvider } from "@/lib/kyc/providers"
import { updateKycSession } from "@/lib/billing/store"
import { recordConsentEvent, saveVerification } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature =
    request.headers.get("x-kyc-signature") ||
    request.headers.get("x-signature") ||
    request.headers.get("stripe-signature")

  const provider = resolveKycProvider()
  const verified = await provider.verifyWebhook({ rawBody, signatureHeader: signature })
  if (!verified.ok) {
    return Response.json({ ok: false, error: verified.error }, { status: 401 })
  }

  if (verified.sessionId) {
    updateKycSession(verified.sessionId, {
      status: verified.status,
      providerRef: verified.providerRef,
    })
  }

  let userId = ""
  try {
    const body = JSON.parse(rawBody) as Record<string, unknown>
    userId = String(body.userId ?? body.user_id ?? "")
  } catch {
    userId = ""
  }
  if (userId && verified.status === "approved") {
    saveVerification({
      userId,
      country: "India",
      region: "",
      docType: "kyc_provider",
      fileName: verified.providerRef,
      faceName: "provider-hosted",
      score: 0.95,
      result: "match",
    })
    recordConsentEvent({
      userId,
      email: null,
      purpose: "kyc_provider_webhook",
      version: "dpdp-2023-v1",
    })
  }

  return Response.json({ ok: true, status: verified.status })
}

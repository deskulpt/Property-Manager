"use server"

import { redirect } from "next/navigation"
import { resolveKycProvider } from "@/lib/kyc/providers"
import { createKycSessionRow, updateKycSession } from "@/lib/billing/store"
import { recordConsentEvent, saveVerification } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export async function startKycRedirectAction(): Promise<void> {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") {
    redirect("/login?next=/account/verify")
  }
  recordConsentEvent({
    userId: user.id,
    email: user.email,
    purpose: "kyc_provider_redirect",
    version: "dpdp-2023-v1",
  })
  const provider = resolveKycProvider()
  const started = await provider.startSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    returnUrl: "/account/verify/callback",
    consentVersion: "dpdp-2023-v1",
  })
  if (!started.ok) {
    redirect(`/account/verify?error=${encodeURIComponent(started.error)}`)
  }
  createKycSessionRow({
    id: started.sessionId,
    userId: user.id,
    provider: started.provider,
    status: "pending",
    redirectUrl: started.redirectUrl,
    consentVersion: "dpdp-2023-v1",
  })
  redirect(started.redirectUrl)
}

export async function completeKycCallbackAction(input: {
  session: string
  status: string
  provider?: string
}): Promise<void> {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") {
    redirect("/login?next=/account/verify")
  }
  const status = input.status === "declined" ? "declined" : "approved"
  updateKycSession(input.session, {
    status,
    providerRef: `${(input.provider ?? "demo").toUpperCase()}-${user.id.slice(0, 8)}`,
  })
  if (status === "approved") {
    saveVerification({
      userId: user.id,
      country: "India",
      region: "",
      docType: "kyc_provider",
      fileName: `${(input.provider ?? "demo").toUpperCase()}-REDIRECT`,
      faceName: "provider-hosted",
      score: 0.94,
      result: "match",
    })
  }
  redirect("/account/verify?kyc=1")
}

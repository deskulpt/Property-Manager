"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  buildCanadaLandlordMonthlyStatement,
  completeLandlordConnectOnboarding,
  completePadMandateDemo,
  confirmCanadaRentCheckoutDemo,
  startCanadaRentCheckout,
  startLandlordConnectOnboarding,
  startPadMandateSetup,
} from "@/lib/billing/ca-connect-e2e"
import { getSessionUser } from "@/lib/session"

async function requireLandlordSession(): Promise<{ tenantId: string; email: string }> {
  const user = await getSessionUser()
  if (!user?.tenantId || user.role !== "landlord_admin") {
    redirect("/login?next=/landlord/billing/connect")
  }
  return { tenantId: user.tenantId, email: user.email }
}

function refreshConnectPaths() {
  revalidatePath("/landlord/billing")
  revalidatePath("/landlord/billing/connect")
  revalidatePath("/landlord/billing/connect/onboard")
  revalidatePath("/landlord/billing/connect/pad")
  revalidatePath("/landlord/billing/connect/statement")
  revalidatePath("/landlord/billing/connect-checkout")
}

export async function startConnectOnboardingAction(): Promise<void> {
  const { tenantId, email } = await requireLandlordSession()
  const started = startLandlordConnectOnboarding({ tenantId, email })
  refreshConnectPaths()
  redirect(started.demoAccountLinkUrl)
}

export async function completeConnectOnboardingAction(): Promise<void> {
  const { tenantId } = await requireLandlordSession()
  completeLandlordConnectOnboarding(tenantId)
  refreshConnectPaths()
  redirect("/landlord/billing/connect?onboard=done")
}

export async function startPadMandateAction(formData: FormData): Promise<void> {
  const { tenantId } = await requireLandlordSession()
  const bankLast4 = String(formData.get("bank_last4") ?? "")
  try {
    const started = startPadMandateSetup({ tenantId, bankLast4 })
    refreshConnectPaths()
    redirect(started.demoPadSetupUrl)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "pad-failed"
    redirect(`/landlord/billing/connect?error=${encodeURIComponent(msg)}`)
  }
}

export async function completePadMandateAction(formData: FormData): Promise<void> {
  await requireLandlordSession()
  const mandateId = String(formData.get("mandate_id") ?? "")
  if (!mandateId) {
    redirect("/landlord/billing/connect?error=missing-mandate")
  }
  completePadMandateDemo(mandateId)
  refreshConnectPaths()
  redirect("/landlord/billing/connect?pad=active")
}

export async function startRentCheckoutAction(formData: FormData): Promise<void> {
  const { tenantId, email } = await requireLandlordSession()
  const rentCadCents = Math.round(Number(formData.get("rent_cad_cents") ?? "0"))
  const padMandateId = String(formData.get("pad_mandate_id") ?? "") || null
  const paymentsFeeBpsRaw = formData.get("payments_fee_bps")
  const paymentsFeeBps = paymentsFeeBpsRaw ? Number(paymentsFeeBpsRaw) : undefined
  try {
    const started = startCanadaRentCheckout({
      tenantId,
      customerEmail: email,
      rentCadCents,
      padMandateId,
      paymentsFeeBps: Number.isFinite(paymentsFeeBps) ? paymentsFeeBps : undefined,
    })
    refreshConnectPaths()
    const url = new URL(started.plan.demoHostedCheckoutUrl, "http://local.invalid")
    url.searchParams.set("checkout", started.checkout.id)
    redirect(`${url.pathname}?${url.searchParams.toString()}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "checkout-failed"
    redirect(`/landlord/billing/connect?error=${encodeURIComponent(msg)}`)
  }
}

export async function confirmRentCheckoutDemoAction(formData: FormData): Promise<void> {
  await requireLandlordSession()
  const checkoutId = String(formData.get("checkout_id") ?? "")
  if (!checkoutId) {
    redirect("/landlord/billing/connect?error=missing-checkout")
  }
  try {
    confirmCanadaRentCheckoutDemo(checkoutId)
    refreshConnectPaths()
    redirect("/landlord/billing/connect?checkout=demo_settled")
  } catch (err) {
    const msg = err instanceof Error ? err.message : "settle-failed"
    redirect(`/landlord/billing/connect?error=${encodeURIComponent(msg)}`)
  }
}

export async function buildMonthlyStatementAction(formData: FormData): Promise<void> {
  const { tenantId } = await requireLandlordSession()
  const period = String(formData.get("period") ?? "") || undefined
  try {
    const { statement } = buildCanadaLandlordMonthlyStatement({
      tenantId,
      periodYyyyMm: period,
    })
    refreshConnectPaths()
    redirect(
      `/landlord/billing/connect/statement?period=${encodeURIComponent(statement.periodYyyyMm)}`,
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : "statement-failed"
    redirect(`/landlord/billing/connect?error=${encodeURIComponent(msg)}`)
  }
}

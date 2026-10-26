"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import {
  activateBillingSubscription,
  cancelBillingSubscription,
  startBillingCheckout,
} from "@/lib/billing/store"
import type { BillingCadence, BillableSegment, UnitMix } from "@/lib/billing/pricing"
import { getSessionUser } from "@/lib/session"

function parseMix(formData: FormData): UnitMix[] {
  const segments: BillableSegment[] = ["homes", "retail_office", "industrial"]
  const mix: UnitMix[] = []
  for (const segment of segments) {
    const count = Number(formData.get(`units_${segment}`) ?? "0")
    if (Number.isFinite(count) && count > 0) {
      mix.push({ segment, count: Math.floor(count) })
    }
  }
  return mix
}

export async function startCheckoutAction(formData: FormData): Promise<void> {
  const user = await getSessionUser()
  if (!user?.tenantId || user.role !== "landlord_admin") {
    redirect("/login?next=/landlord/billing")
  }
  const cadence = (String(formData.get("cadence") ?? "monthly") === "annual"
    ? "annual"
    : "monthly") as BillingCadence
  const mix = parseMix(formData)
  const billingCountry = String(formData.get("billing_country") ?? "IN")
  const result = await startBillingCheckout({
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    mix,
    cadence,
    billingCountry,
    successUrl: "/landlord/billing?paid=1",
    cancelUrl: "/landlord/billing?canceled=1",
  })
  if (!result.ok) {
    redirect(`/landlord/billing?error=${encodeURIComponent(result.error)}`)
  }
  redirect(result.checkoutUrl)
}

export async function confirmDemoCheckoutAction(formData: FormData): Promise<void> {
  const user = await getSessionUser()
  if (!user?.tenantId || user.role !== "landlord_admin") {
    redirect("/login?next=/landlord/billing")
  }
  const ref = String(formData.get("ref") ?? "")
  if (!ref) {
    redirect("/landlord/billing?error=missing-ref")
  }
  const activated = activateBillingSubscription({
    subscriptionId: ref,
    externalSubscriptionId: String(formData.get("session") ?? ref),
  })
  if (!activated.ok) {
    redirect(`/landlord/billing?error=${encodeURIComponent(activated.error)}`)
  }
  revalidatePath("/landlord/billing")
  revalidatePath("/landlord/settings")
  redirect("/landlord/billing?paid=1")
}

export async function cancelSubscriptionAction(): Promise<void> {
  const user = await getSessionUser()
  if (!user?.tenantId || user.role !== "landlord_admin") {
    redirect("/login?next=/landlord/billing")
  }
  const result = await cancelBillingSubscription(user.tenantId)
  if (!result.ok) {
    redirect(`/landlord/billing?error=${encodeURIComponent(result.error)}`)
  }
  revalidatePath("/landlord/billing")
  revalidatePath("/landlord/settings")
  redirect("/landlord/billing?canceled=1")
}

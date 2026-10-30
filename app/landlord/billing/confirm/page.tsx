import { PageHeader } from "@/components/product"
import { ConfirmCheckoutForm } from "@/components/billing/billing-desk"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Confirm checkout" }

export default async function ConfirmBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; ref?: string; provider?: string }>
}) {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const params = await searchParams
  const session = params.session ?? ""
  const ref = params.ref ?? ""

  return (
    <div>
      <PageHeader
        kicker={params.provider ?? "checkout"}
        title="Confirm test payment"
        lede="This step stands in for hosted Dodo / Stripe / PayPal (sandbox) checkout while keys are unset."
      />
      {session && ref ? (
        <ConfirmCheckoutForm session={session} refId={ref} />
      ) : (
        <p className="text-sm text-ink-soft">Missing session reference.</p>
      )}
    </div>
  )
}
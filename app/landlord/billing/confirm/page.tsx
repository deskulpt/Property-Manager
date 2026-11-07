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
        lede="Stand-in for Stripe-hosted Checkout (Deskulpt Inc CA subscriptions). Ontario rent Connect DIRECT+PAD uses /landlord/billing/connect-checkout — flag OFF. India money parked."
      />
      {session && ref ? (
        <ConfirmCheckoutForm session={session} refId={ref} />
      ) : (
        <div className="border border-ink/10 bg-card p-4 text-sm">
          <p className="text-ink-soft">Missing checkout session. Start again from Billing or Pricing.</p>
          <p className="mt-3 flex flex-wrap gap-3 font-semibold">
            <a href="/landlord/billing" className="text-terra hover:underline">
              Back to billing
            </a>
            <a href="/pricing" className="text-terra hover:underline">
              Pricing
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
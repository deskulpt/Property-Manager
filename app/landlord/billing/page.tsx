import { PageHeader } from "@/components/product"
import { BillingDesk } from "@/components/billing/billing-desk"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Billing" }

export default async function LandlordBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; canceled?: string }>
}) {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const params = await searchParams
  const notice = params.paid
    ? "Subscription activated (test mode)."
    : params.canceled
      ? "Subscription canceled. You are on Free (1 unit)."
      : null

  return (
    <div>
      <PageHeader
        kicker="Organisation"
        title="Billing"
        lede="Platform subscription for unit meters. Cancel anytime. Test-mode providers only — no live charges."
      />
      <BillingDesk tenantId={user.tenantId} notice={notice} />
    </div>
  )
}

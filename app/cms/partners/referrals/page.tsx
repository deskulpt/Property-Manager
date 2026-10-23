import { EmptyState, PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { submitReferralInvite } from "@/lib/partners/actions"
import { listPartnerReferrals } from "@/lib/partners/store"
import { canOpenCms } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Partner referrals" }

export default async function PartnerReferralsPage() {
  const user = await getSessionUser()
  if (
    !user ||
    !canOpenCms(user.role) ||
    !["super_admin", "account_manager", "service_manager"].includes(user.role)
  ) {
    return <EmptyState title="Referrals" body="Staff only." />
  }
  const rows = listPartnerReferrals()
  return (
    <div>
      <PageHeader
        kicker="§19C"
        title="Partner referrals"
        lede="Refer-a-partner leads. Invite moves status to invited so ops can send the apply link."
      />
      <div className="grid gap-3">
        {rows.map((row) => (
          <article key={row.id} className="bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="font-sans text-lg font-extrabold">{row.referredName}</h2>
            <p className="text-sm text-ink-soft">
              {row.track}/{row.subtype} · {row.city} {row.pin} · from {row.referrerName}
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              {row.status}
            </p>
            {row.status === "new" ? (
              <form action={submitReferralInvite} className="mt-3">
                <input type="hidden" name="id" value={row.id} />
                <SubmitButton pendingLabel="…">Mark invited</SubmitButton>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  )
}

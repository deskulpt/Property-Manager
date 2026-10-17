import Link from "next/link"
import { PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { submitReferralInvite } from "@/lib/partners/actions"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { listPartnerReferrals } from "@/lib/partners/store"

export const metadata = { title: "Referrals · Console" }

export default async function ConsoleReferralsPage() {
  await requirePlatformAdmin()
  const rows = listPartnerReferrals()
  return (
    <div>
      <PageHeader
        kicker="CMS"
        title="Referrals"
        lede="Partner refer-a-partner leads. Invite marks a lead so ops can send the apply link."
      />
      <p className="mb-4 text-sm text-ink-soft">
        Also see{" "}
        <Link href="/cms/partners/referrals" className="text-terra underline">
          CMS partner referrals
        </Link>
        .
      </p>
      <div className="grid gap-3">
        {rows.map((row) => (
          <article key={row.id} className="border border-ink/10 bg-card p-4">
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
        {rows.length === 0 ? <p className="text-sm text-ink-soft">No referral leads yet.</p> : null}
      </div>
    </div>
  )
}

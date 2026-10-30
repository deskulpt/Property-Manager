import Link from "next/link"
import { EmptyState, PageHeader, RoleGate, StatusBadge } from "@/components/product"
import {
  ensureReferrerForUser,
  getReferrerByUserId,
  indicationsForReferrer,
  rewardsForReferrer,
} from "@/lib/db"
import { formatDay } from "@/lib/format"
import { formatInrPaise, maskPhone, STATUS_LABELS } from "@/lib/referrals"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Referrals dashboard" }

export default async function ReferDashboardPage() {
  const session = await getSessionUser()
  if (!session) {
    return (
      <RoleGate
        title="Referrer dashboard"
        body="Sign in as Asha Reddy (Refer & Earn) or any account with a referral profile to see seeded India C&I indications."
        action={{ href: "/login?next=/refer/dashboard", label: "Log in" }}
      />
    )
  }

  const referrer =
    getReferrerByUserId(session.id) ??
    (session.role === "referrer" ? ensureReferrerForUser(session) : null)

  if (!referrer) {
    return (
      <main className="mx-auto max-w-[960px] px-4 py-10 md:px-8">
        <EmptyState
          title="No referrer profile yet"
          body="Open Get my referral link or submit a property to create your code."
          action={{ href: "/refer/link", label: "Get my referral link" }}
        />
      </main>
    )
  }

  const indications = indicationsForReferrer(referrer.id)
  const rewards = rewardsForReferrer(referrer.id)

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-10 md:px-8">
      <div
        className="mb-6 border border-[#8f6f1f]/35 bg-[#8f6f1f]/10 px-4 py-3 text-sm text-ink"
        role="status"
      >
        Payouts are simulated — no real bank transfer. Demo ledger only.
      </div>
      <PageHeader
        kicker={`${referrer.code} · ${referrer.name}`}
        title="Indications"
        lede="Property sourcing referrals for Easy Rental. Status advances in CMS; rewards accrue on Published and Leased."
      />
      <div className="mb-6 flex flex-wrap gap-4 text-sm">
        <Link href="/refer/rewards" className="font-heading font-bold text-terra underline">
          Rewards ledger ({rewards.length})
        </Link>
        <Link href="/refer/submit" className="font-heading font-bold text-ink-soft underline">
          Submit property
        </Link>
        <Link href="/refer/link" className="font-heading font-bold text-ink-soft underline">
          Share link
        </Link>
      </div>

      {indications.length === 0 ? (
        <EmptyState
          title="No indications yet"
          body="Submit a warehouse or share your link to start earning demo rewards."
          action={{ href: "/refer/submit", label: "Submit a property" }}
        />
      ) : (
        <div className="overflow-x-auto border border-ink/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-paper-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              <tr>
                <th className="px-3 py-3">Property</th>
                <th className="px-3 py-3">Landlord</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Path</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Expires</th>
                <th className="px-3 py-3">Rewards</th>
              </tr>
            </thead>
            <tbody>
              {indications.map((ind) => {
                const tied = rewards.filter((r) => r.indicationId === ind.id)
                const rewardSum = tied.reduce((s, r) => s + r.amountPaise, 0)
                return (
                  <tr key={ind.id} className="border-t border-ink/10">
                    <td className="px-3 py-3">
                      <p className="font-heading font-bold">
                        {ind.propertyCity} · {ind.propertyType.replace("_", " ")}
                      </p>
                      <p className="text-xs text-ink-faint">{ind.propertyAddress}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p>{ind.landlordName}</p>
                      <p className="font-mono text-xs text-ink-faint">{maskPhone(ind.landlordPhone)}</p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={ind.status} />
                      <span className="sr-only">{STATUS_LABELS[ind.status]}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs uppercase">{ind.path}</td>
                    <td className="px-3 py-3">{formatDay(ind.createdAt.slice(0, 10))}</td>
                    <td className="px-3 py-3">{formatDay(ind.attributionExpiresAt)}</td>
                    <td className="px-3 py-3 font-mono text-xs">
                      {tied.length ? formatInrPaise(rewardSum) : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

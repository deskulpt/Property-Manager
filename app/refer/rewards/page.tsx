import Link from "next/link"
import { EmptyState, PageHeader, RoleGate, StatusBadge } from "@/components/product"
import { getReferrerByUserId, rewardsForReferrer } from "@/lib/db"
import { formatDay } from "@/lib/format"
import { formatInrPaise } from "@/lib/referrals"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Referral rewards" }

export default async function ReferRewardsPage() {
  const session = await getSessionUser()
  if (!session) {
    return (
      <RoleGate
        title="Rewards ledger"
        body="Sign in as Asha Reddy to see accrued, payable, and paid_demo INR reward rows."
        action={{ href: "/login?next=/refer/rewards", label: "Log in" }}
      />
    )
  }
  const referrer = getReferrerByUserId(session.id)
  if (!referrer) {
    return (
      <main className="mx-auto max-w-[960px] px-4 py-10">
        <EmptyState
          title="No ledger yet"
          body="Create a referral profile first."
          action={{ href: "/refer/link", label: "Get my referral link" }}
        />
      </main>
    )
  }

  const rewards = rewardsForReferrer(referrer.id)

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-10 md:px-8">
      <div
        className="mb-6 border border-[#8f6f1f]/35 bg-[#8f6f1f]/10 px-4 py-3 text-sm"
        role="status"
      >
        Payouts are simulated — no real bank transfer. Add bank details (demo) near the 15th of the month after the event.
      </div>
      <PageHeader
        kicker={`${referrer.code} · proposed rewards`}
        title="Demo INR ledger"
        lede="₹2,000 on Published · 5% of first-month rent on Leased. Status moves accrued → payable → paid_demo."
      />
      <Link href="/refer/dashboard" className="mb-6 inline-block font-heading text-sm font-bold text-terra underline">
        ← Indications
      </Link>

      {rewards.length === 0 ? (
        <EmptyState title="No rewards yet" body="Publish or lease an indication to accrue demo rewards." />
      ) : (
        <div className="overflow-x-auto border border-ink/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-paper-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              <tr>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Indication</th>
                <th className="px-3 py-3">Event</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Available</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((row) => (
                <tr key={row.id} className="border-t border-ink/10">
                  <td className="px-3 py-3">{formatDay(row.createdAt.slice(0, 10))}</td>
                  <td className="px-3 py-3">
                    {row.propertyCity}
                    <span className="block text-xs text-ink-faint">{row.propertyAddress}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs uppercase">{row.kind}</td>
                  <td className="px-3 py-3 font-heading font-bold">{formatInrPaise(row.amountPaise)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-3">{formatDay(row.availableOn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

import Link from "next/link"
import { PageHeader } from "@/components/product"
import {
  ensureReferrerForDemo,
  listRewardsForReferrer,
  referrerRewardTotals,
} from "@/lib/db"
import { formatInrFromPaise } from "@/lib/referrals"

export const metadata = { title: "Referral rewards" }

export default async function ReferRewardsPage() {
  const referrer = ensureReferrerForDemo()
  const rewards = listRewardsForReferrer(referrer.id)
  const totals = referrerRewardTotals(referrer.id)

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-12 md:px-8">
      <PageHeader
        kicker="Refer & Earn · DEMO ledger"
        title="Rewards"
        lede="Proposed: ₹2,000 on Published · 5% of first-month rent on Leased. Payable around the 15th of the month after the event (demo clock)."
      />

      <div
        className="mb-6 border border-pending/40 bg-pending/10 px-4 py-3 text-sm"
        role="status"
      >
        Payouts are simulated — no real bank transfer. Add bank details (demo) — never calls a payout
        API.
      </div>

      <p className="mb-6 text-sm text-ink-soft">
        Total DEMO{" "}
        <span className="font-semibold text-ink">{formatInrFromPaise(totals.total)}</span>
        {" · "}
        <Link href="/refer/dashboard" className="font-semibold text-terra hover:underline">
          Back to dashboard
        </Link>
      </p>

      {rewards.length === 0 ? (
        <p className="border border-dashed border-ink/20 px-4 py-10 text-center text-sm text-ink-soft">
          No reward rows yet. Advance an indication to Published or Leased.
        </p>
      ) : (
        <div className="overflow-x-auto border border-ink/15">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-brand text-paper">
              <tr className="font-mono text-[10px] uppercase tracking-[0.12em]">
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Indication</th>
                <th className="px-3 py-2.5 font-medium">Event</th>
                <th className="px-3 py-2.5 font-medium">Amount</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Available</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((r) => (
                <tr key={r.id} className="border-t border-ink/10 bg-card">
                  <td className="px-3 py-3 font-mono text-[11px]">{r.createdAt.slice(0, 10)}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-ink-faint">
                    {r.indicationId.slice(0, 12)}
                  </td>
                  <td className="px-3 py-3 font-medium capitalize">{r.kind}</td>
                  <td className="px-3 py-3 font-semibold">
                    {formatInrFromPaise(r.amountPaise)}
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-terra">
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-ink-soft">
                    {r.availableOn ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

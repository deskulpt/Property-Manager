import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { ledgerForUser, leasesForOccupant, ruleForTenant } from "@/lib/db"
import { addDays, formatDay, money, todayISO } from "@/lib/format"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Portal ledger" }

export default async function PortalLedgerPage() {
  const user = await getSessionUser()
  if (!user) return null
  const entries = ledgerForUser(user.id)
  const leases = leasesForOccupant(user.id)
  const rule = leases[0] ? ruleForTenant(leases[0].tenantId) : null
  const today = todayISO()

  return (
    <div>
      <PageHeader
        kicker="Same books · INR"
        title="Rent, fees, interest, payments."
        lede="Late fee and interest lines use the landlord’s rule. Interest is simple daily on overdue principal after grace."
      />
      {rule ? (
        <p className="mb-4 text-sm text-ink-soft">
          Rule: {rule.graceDays} day grace · flat {money(rule.flatCents)} or {rule.percentBps / 100}% of rent
          (whichever higher) · interest {rule.interestRateApr}% APR.
        </p>
      ) : null}
      {entries.length === 0 ? (
        <EmptyState title="No ledger yet" body="Approving an application posts rent and GST here." />
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-paper-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const grace =
                  entry.kind === "rent" && entry.status === "due" && entry.dueOn && rule
                    ? today <= addDays(entry.dueOn, rule.graceDays)
                      ? `Grace until ${formatDay(addDays(entry.dueOn, rule.graceDays))}`
                      : "Past grace"
                    : null
                return (
                  <tr key={entry.id} className="border-t border-border">
                    <td className="px-3 py-3">{formatDay(entry.dueOn)}</td>
                    <td className="px-3 py-3">
                      {entry.description}
                      <span className="mt-1 block text-xs text-ink-soft">
                        {entry.propertyName} · Unit {entry.unitCode}
                        {grace ? ` · ${grace}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                      {entry.kind}
                    </td>
                    <td className="px-3 py-3 font-bold">{money(entry.amountCents)}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={entry.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

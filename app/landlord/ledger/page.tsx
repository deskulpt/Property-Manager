import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { submitAssessment, submitLateFeeRule } from "@/lib/actions"
import { ledgerForTenant, ruleForTenant } from "@/lib/db"
import { formatDay, money } from "@/lib/format"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Ledger" }

export default async function LedgerPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const rule = ruleForTenant(user.tenantId)
  const entries = ledgerForTenant(user.tenantId)
  return (
    <div>
      <PageHeader
        kicker="Books"
        title="Ledger and late fees"
        lede="The rule is grace days, then the greater of a flat fee and a percent of that rent. Run the assessment to post any fee the rule now earns. It will not double-charge a rent line."
      />
      <form action={submitLateFeeRule} className="mb-6 grid gap-3 bg-card p-4 ring-1 ring-foreground/10 md:grid-cols-4">
        <label className="grid gap-1 text-sm">
          Grace days
          <input name="graceDays" type="number" min={0} defaultValue={rule.graceDays} className="h-9 border border-input bg-background px-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Flat fee (CAD)
          <input name="flatDollars" type="number" min={0} step="0.01" defaultValue={(rule.flatCents / 100).toFixed(2)} className="h-9 border border-input bg-background px-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Percent of rent
          <input name="percent" type="number" min={0} step="0.01" defaultValue={(rule.percentBps / 100).toFixed(2)} className="h-9 border border-input bg-background px-2" />
        </label>
        <div className="flex items-end">
          <SubmitButton pendingLabel="Saving…">Save rule</SubmitButton>
        </div>
      </form>
      <form action={submitAssessment} className="mb-6">
        <SubmitButton variant="outline" pendingLabel="Assessing…">Run late-fee assessment</SubmitButton>
      </form>
      {entries.length === 0 ? (
        <EmptyState title="No ledger rows" body="Approving an application posts the next rent. Until then this organisation’s books are empty." />
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-paper-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              <tr>
                <th className="px-3 py-2">Payer</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-border">
                  <td className="px-3 py-3">{entry.payerName}</td>
                  <td className="px-3 py-3">{entry.description}</td>
                  <td className="px-3 py-3">{formatDay(entry.dueOn)}</td>
                  <td className="px-3 py-3 font-bold">{money(entry.amountCents)}</td>
                  <td className="px-3 py-3"><StatusBadge status={entry.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

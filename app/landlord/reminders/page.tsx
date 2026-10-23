import { PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { submitRentReminders } from "@/lib/actions"
import { ledgerForTenant } from "@/lib/db"
import { formatDay, money, todayISO } from "@/lib/format"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Reminders" }

export default async function LandlordRemindersPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const today = todayISO()
  const due = ledgerForTenant(user.tenantId).filter(
    (entry) => entry.status === "due" && (entry.kind === "rent" || entry.kind === "gst"),
  )

  return (
    <div>
      <PageHeader
        kicker="Rent · membership"
        title="Dues and reminders."
        lede="Run today’s reminder pass. T−3 and T+1 notices enqueue once per line (idempotent). Demo email / push / WhatsApp rows appear in the inbox."
      />
      <form action={submitRentReminders} className="mb-8">
        <SubmitButton pendingLabel="Queueing…">Send today’s reminders</SubmitButton>
      </form>
      <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
        Open rent / GST as of {formatDay(today)}
      </p>
      <div className="overflow-x-auto border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-paper-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            <tr>
              <th className="px-3 py-2">Occupant</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {due.map((entry) => (
              <tr key={entry.id} className="border-t border-border">
                <td className="px-3 py-3">{entry.payerName}</td>
                <td className="px-3 py-3">
                  {entry.description}
                  <span className="mt-1 block text-xs text-ink-soft">
                    {entry.propertyName} · Unit {entry.unitCode}
                  </span>
                </td>
                <td className="px-3 py-3">{formatDay(entry.dueOn)}</td>
                <td className="px-3 py-3 font-bold">{money(entry.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

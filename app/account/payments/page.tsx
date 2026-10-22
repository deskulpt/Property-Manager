import { EmptyState, PageHeader, RoleGate, StatusBadge } from "@/components/product"
import { AutopayForm, MethodForm, PayForm } from "@/components/payments/pay-desk"
import { ledgerForUser, methodsForUser, ruleForTenant, tenantsForApplicant } from "@/lib/db"
import { addDays, formatDay, money, todayISO } from "@/lib/format"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Payments" }

export default async function PaymentsPage() {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") {
    return (
      <RoleGate
        title="The ledger is on the applicant desk"
        body="Sign in as an approved applicant, or use Devon Hale in the Demo switcher when enabled."
      />
    )
  }
  const entries = ledgerForUser(user.id)
  const methods = methodsForUser(user.id)
  const tenants = tenantsForApplicant(user.id)
  const today = todayISO()
  const due = entries.filter((entry) => entry.status === "due" && entry.kind !== "payment")
  const tenantId = methods[0]?.tenantId ?? entries[0]?.tenantId ?? tenants[0]?.id
  const rule = tenantId ? ruleForTenant(tenantId) : null

  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <PageHeader
        kicker="Demo adapter · UPI / eNACH · INR"
        title="Rent, GST, late fees, and what was paid."
        lede="Charges are in INR. The payment provider is an interface — this build uses the India demo adapter only. Autopay sets a flag. Recording a payment posts the ledger. Nothing leaves the machine."
      />
      {entries.length === 0 ? (
        <EmptyState title="No ledger yet" body="Rent and GST lines appear after a landlord approves an application. You can still save a demo UPI or eNACH method once you have applied." />
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-paper-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Amount (INR)</th>
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
                    <td className="px-3 py-3 font-sans font-bold">{money(entry.amountCents)}</td>
                    <td className="px-3 py-3"><StatusBadge status={entry.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {rule ? (
        <p className="mt-4 text-sm text-ink-soft">
          Late fee rule: {rule.graceDays} day grace, flat {money(rule.flatCents)} or {rule.percentBps / 100}% of rent, whichever is higher.
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-sans text-lg font-extrabold">Payment method</h2>
          {methods.map((method) => (
            <div key={method.id} className="mt-3 text-sm">
              <p>{method.brand} ····{method.last4}</p>
              <p className="text-ink-soft">Provider ref {method.providerRef}</p>
              <div className="mt-3">
                <AutopayForm tenantId={method.tenantId} enabled={method.autopay} />
              </div>
            </div>
          ))}
          <div className="mt-4">
            <MethodForm tenants={tenants} />
          </div>
        </section>
        <section className="bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-sans text-lg font-extrabold">Open balance</h2>
          <p className="mt-2 font-sans text-3xl font-black">{money(due.reduce((sum, entry) => sum + entry.amountCents, 0))}</p>
          <p className="mt-1 text-sm text-ink-soft">{due.length} open item{due.length === 1 ? "" : "s"} in INR. Posting uses the demo adapter and marks them paid.</p>
          {tenantId && due.length > 0 ? (
            <div className="mt-4">
              <PayForm tenantId={tenantId} />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

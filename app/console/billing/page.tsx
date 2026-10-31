import Link from "next/link"
import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { billingAdapterStatus, listPlatformSubscriptions } from "@/lib/platform-ops"
import { planLabel } from "@/lib/plans"

export const metadata = { title: "Billing · Command center" }

export default async function ConsoleBillingPage() {
  await requirePlatformAdmin()
  const rows = listPlatformSubscriptions()
  const adapters = billingAdapterStatus()

  return (
    <div data-testid="console-billing">
      <PageHeader
        kicker="Subscriptions"
        title="Billing status"
        lede="Landlord-paid per-unit SaaS seats. Seekers never pay the platform. MoR: IN → primary provider; non-IN payers → intl (PayPal)."
      />
      <div className="mb-6 grid gap-2">
        {adapters.map((a) => (
          <div key={a.id} className="border border-brand/15 bg-card px-4 py-3 text-sm">
            <p className="font-mono text-[11px] uppercase tracking-wider text-terra">
              {a.label} · {a.mode}
            </p>
            <p className="mt-1 text-ink-soft">{a.detail}</p>
          </div>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No subscription rows"
          body="When a landlord completes /landlord/billing or /pricing/subscribe, rows appear here."
          action={{ href: "/pricing", label: "Open public pricing" }}
        />
      ) : (
        <div className="overflow-x-auto border border-brand/15">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-brand/[0.04] font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              <tr>
                <th className="px-3 py-3">Tenant</th>
                <th className="px-3 py-3">Provider</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Package</th>
                <th className="px-3 py-3">Cadence</th>
                <th className="px-3 py-3">Period end</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-brand/10">
                  <td className="px-3 py-3 font-semibold">{row.tenantName}</td>
                  <td className="px-3 py-3 font-mono text-xs">{row.provider}</td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      status={
                        row.status === "active" || row.status === "trialing" ? "verified" : "pending"
                      }
                    />
                    <span className="ml-2 font-mono text-[10px] uppercase">{row.status}</span>
                  </td>
                  <td className="px-3 py-3">{planLabel(row.package as never)}</td>
                  <td className="px-3 py-3">{row.cadence}</td>
                  <td className="px-3 py-3 font-mono text-xs">{row.currentPeriodEnd?.slice(0, 10) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

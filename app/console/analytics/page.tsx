import { PageHeader } from "@/components/product"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { platformAnalytics } from "@/lib/db"
import { money } from "@/lib/format"

export const metadata = { title: "Analytics · Console" }

export default async function ConsoleAnalyticsPage() {
  await requirePlatformAdmin()
  const kpi = platformAnalytics()
  const rows = [
    { label: "Landlord organisations", value: String(kpi.landlords) },
    { label: "Units (all)", value: String(kpi.listings) },
    { label: "Units available", value: String(kpi.available) },
    { label: "Applications", value: String(kpi.applications) },
    { label: "Visit requests", value: String(kpi.visits) },
    { label: "Service providers", value: String(kpi.providers) },
    { label: "Lease ledger GMV (paid)", value: money(kpi.ledgerGmvCents) },
    { label: "Shop GMV (paid)", value: money(kpi.shopGmvCents) },
  ]
  return (
    <div>
      <PageHeader
        kicker="Platform"
        title="Analytics"
        lede="Live counts from the seeded portfolio. Ledger and shop GMV are local payment rows, not a bank feed."
      />
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="border border-ink/10 bg-card px-4 py-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">{row.label}</dt>
            <dd className="mt-2 font-serif text-2xl font-semibold text-brand">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

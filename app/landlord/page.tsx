import Link from "next/link"
import { PageHeader } from "@/components/product"
import { landlordOverview } from "@/lib/db"
import { money } from "@/lib/format"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Landlord" }

export default async function LandlordHome() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const overview = landlordOverview(user.tenantId)
  const cards = [
    [`${overview.occupancy}%`, "Occupancy"],
    [money(overview.rentRollCents), "Monthly rent roll"],
    [String(overview.openApplications), "Applications in review"],
    [String(overview.openJobs), "Open concierge jobs"],
    [money(overview.dueCents), "Open ledger balance"],
    [`${overview.leasedCount}/${overview.unitCount}`, "Bays leased"],
  ]
  return (
    <div>
      <PageHeader
        kicker={user.tenantName ?? ""}
        title="Portfolio overview"
        lede="Figures are calculated from this organisation’s rows. Switch landlords in the header and the numbers change."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map(([value, label]) => (
          <div key={label} className="bg-card p-4 ring-1 ring-foreground/10">
            <p className="font-sans text-2xl font-black text-brand">{value}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
        <Link href="/landlord/applications" className="text-brand">Review applications</Link>
        <Link href="/landlord/jobs" className="text-brand">Concierge jobs</Link>
        <Link href="/landlord/ledger" className="text-brand">Ledger and late fees</Link>
      </div>
    </div>
  )
}

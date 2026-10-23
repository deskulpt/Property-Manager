import Link from "next/link"
import { MoneyPair } from "@/components/money-pair"
import { PageHeader } from "@/components/product"
import { landlordOverview } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Landlord" }

export default async function LandlordHome() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const overview = landlordOverview(user.tenantId)
  const display = user.displayCurrency
  const cards: { label: string; node: React.ReactNode }[] = [
    { label: "Occupancy", node: `${overview.occupancy}%` },
    {
      label: "Monthly rent roll",
      node: <MoneyPair inrMinor={overview.rentRollCents} display={display} />,
    },
    { label: "Applications in review", node: String(overview.openApplications) },
    { label: "Open concierge jobs", node: String(overview.openJobs) },
    {
      label: "Open ledger balance",
      node: <MoneyPair inrMinor={overview.dueCents} display={display} />,
    },
    { label: "Bays leased", node: `${overview.leasedCount}/${overview.unitCount}` },
  ]
  return (
    <div>
      <PageHeader
        kicker={user.tenantName ?? ""}
        title="Portfolio overview"
        lede={
          display === "INR"
            ? "Figures are calculated from this organisation’s INR rows. Switch landlords in the header and the numbers change."
            : `Display preference is ${display}. Charge currency stays INR — converted figures use the demo FX table.`
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="border border-ink/10 bg-card p-4">
            <div className="font-serif text-2xl font-semibold text-brand">{card.node}</div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              {card.label}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
        <Link href="/landlord/applications" className="text-terra hover:underline">
          Review applications
        </Link>
        <Link href="/landlord/jobs" className="text-terra hover:underline">
          Concierge jobs
        </Link>
        <Link href="/landlord/ask" className="text-terra hover:underline">
          Ask Easy
        </Link>
        <Link href="/landlord/ledger" className="text-terra hover:underline">
          Ledger and late fees
        </Link>
        <Link href="/landlord/settings" className="text-terra hover:underline">
          Display currency &amp; OTP
        </Link>
      </div>
    </div>
  )
}

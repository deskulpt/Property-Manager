import Link from "next/link"
import { DoNextFaq } from "@/components/cms/do-next-faq"
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
        <Link href="/landlord/listings" className="text-terra hover:underline">
          Listings
        </Link>
        <Link href="/landlord/visits" className="text-terra hover:underline">
          Visits
        </Link>
        <Link href="/landlord/shop" className="text-terra hover:underline">
          Shop settings
        </Link>
        <Link href="/agreements/new" className="text-terra hover:underline">
          Agreement studio
        </Link>
        <Link href="/landlord/jobs" className="text-terra hover:underline">
          Concierge jobs
        </Link>
        <Link href="/landlord/ledger" className="text-terra hover:underline">
          Ledger and late fees
        </Link>
        <Link href="/profile" className="text-terra hover:underline">
          Profile
        </Link>
      </div>
      <DoNextFaq
        steps={[
          {
            title: overview.openApplications
              ? `Review ${overview.openApplications} pending applications`
              : "Share listings to attract applicants",
            body: "Pending count also shows on the Applications nav badge.",
          },
          {
            title: "Confirm visits and pricing",
            body: "Keep visit calendar and ₹/SF/month rates current.",
          },
          {
            title: "Assign providers for open work",
            body: "Approve trades, then assign concierge jobs — never auto-assign.",
          },
        ]}
        faqs={[
          {
            q: "Where do I edit listings?",
            a: "Open Listings for create/edit/publish, or Properties for floor-plan pins and QR posters.",
          },
          {
            q: "Can a managing agent help?",
            a: "Yes — invited agents can approve applications and adjust pricing without billing access.",
          },
          {
            q: "Agreement PDFs?",
            a: "Agreement studio generates a downloadable English India C&I template with demo e-sign.",
          },
        ]}
      />
    </div>
  )
}

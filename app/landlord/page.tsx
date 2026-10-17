import Link from "next/link"
import {
  ClipboardList,
  ExternalLink,
  Globe,
  Settings,
  Wallet,
  Wrench,
} from "lucide-react"
import { MoneyPair } from "@/components/money-pair"
import { PageHeader } from "@/components/product"
import { landlordOverview, listCustomDomains } from "@/lib/db"
import { publicOriginForTenant } from "@/lib/listing-url"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Landlord" }

export default async function LandlordHome() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const overview = landlordOverview(user.tenantId)
  const display = user.displayCurrency
  const origin = await publicOriginForTenant(user.tenantId)
  const domains = listCustomDomains(user.tenantId)
  const activeDomain = domains.find((d) => d.status === "active" || d.status === "verified")
  const packageTier = user.tenantPackage ?? "starter"
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
  const primary = [
    { href: "/landlord/applications", label: "Review applications", Icon: ClipboardList },
    { href: "/landlord/jobs", label: "Concierge jobs", Icon: Wrench },
    { href: "/landlord/ledger", label: "Ledger and late fees", Icon: Wallet },
    { href: "/landlord/settings", label: "Hosting & settings", Icon: Settings },
  ]
  return (
    <div>
      <PageHeader
        kicker={user.tenantName ?? "Landlord organisation"}
        title="Portfolio overview"
        lede={
          display === "INR"
            ? "Figures are calculated from this landlord organisation’s INR rows. Occupants and applicants are separate desks."
            : `Display preference is ${display}. Charge currency stays INR — converted figures use the demo FX table.`
        }
      />
      <section className="mb-6 border border-terra/25 bg-accent/60 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-terra">
              <Globe className="h-3.5 w-3.5" aria-hidden />
              Hosted listings link
            </p>
            <p className="mt-2 break-all font-mono text-sm font-semibold text-brand">
              {origin}/properties
            </p>
            <p className="mt-2 max-w-xl text-sm text-ink-soft">
              {activeDomain
                ? "PRO custom domain is active — prospects open your portfolio on your hostname."
                : packageTier === "pro"
                  ? "PRO unlocked. Connect a custom domain under Settings to replace this Easy Rental URL."
                  : "Starter includes this hosted link. Upgrade to PRO for a custom listings domain."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`${origin}/properties`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-brand px-3 py-2 text-[13px] font-semibold text-paper hover:bg-brand-deep"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Open public link
            </a>
            <Link
              href="/landlord/settings"
              className="inline-flex items-center gap-1.5 border border-ink/20 bg-card px-3 py-2 text-[13px] font-semibold text-ink hover:border-terra/40"
            >
              {packageTier === "pro" ? "Custom domain" : "Upgrade path"}
            </Link>
          </div>
        </div>
      </section>
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
        {primary.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="inline-flex items-center gap-1.5 text-terra hover:underline">
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

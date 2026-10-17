import Link from "next/link"
import { PageHeader } from "@/components/product"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { platformAnalytics } from "@/lib/db"
import { money } from "@/lib/format"

export const metadata = { title: "Platform console" }

export default async function ConsoleHomePage() {
  await requirePlatformAdmin()
  const kpi = platformAnalytics()
  const cards = [
    { href: "/console/analytics", title: "Analytics", body: "Platform-wide listings, applications, visits, and GMV." },
    { href: "/console/tenants", title: "Tenants", body: "Landlord org directory — edit package, suspend, impersonate." },
    { href: "/console/shops", title: "Shops catalog", body: "SKUs and shop config across every landlord tenant." },
    { href: "/console/providers", title: "Service providers", body: "Verify, approve, reject, and match to properties." },
    { href: "/console/partners", title: "Partner affiliates", body: "Vetting queue and partner referral ledger." },
    { href: "/console/referrals", title: "Referrals CMS", body: "Refer & Earn indications and reward status." },
    { href: "/console/pricing", title: "Pricing entitlements", body: "Starter / Pro package assignment across tenants." },
  ]
  return (
    <div>
      <PageHeader
        kicker="Easy Rental"
        title="Platform console"
        lede="Manage every landlord tenant, provider, shop catalog, and partner queue from one desk."
      />
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Landlords", value: String(kpi.landlords) },
          { label: "Listings", value: String(kpi.listings) },
          { label: "Applications", value: String(kpi.applications) },
          { label: "Ledger GMV", value: money(kpi.ledgerGmvCents) },
        ].map((item) => (
          <div key={item.label} className="border border-ink/10 bg-card px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">{item.label}</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-brand">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="border border-ink/10 bg-card p-5 transition-colors hover:border-terra/40"
          >
            <h2 className="font-serif text-xl font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-ink-soft">{card.body}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

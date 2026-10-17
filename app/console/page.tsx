import Link from "next/link"
import { iconForHref } from "@/components/nav-icons"
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
    { href: "/console/tenants", title: "Landlord orgs", body: "Landlord / property-management companies — package, suspend, impersonate." },
    { href: "/console/shops", title: "Shops catalog", body: "SKUs and shop config across every landlord organisation." },
    { href: "/console/providers", title: "Service providers", body: "Verify, approve, reject, and match to properties." },
    { href: "/console/partners", title: "Partner affiliates", body: "Vetting queue and partner referral ledger." },
    { href: "/console/referrals", title: "Referrals CMS", body: "Refer & Earn indications and reward status." },
{ href: "/console/pricing", title: "Pricing entitlements", body: "Starter / Pro package assignment across landlord orgs." },
    { href: "/console/crawler", title: "SEO crawler", body: "Crawl public routes, score SEO/a11y hints, approve meta fixes." },
  ]
  return (
    <div>
      <PageHeader
        kicker="Easy Rental"
        title="Platform console"
        lede="SaaS tenants here are landlord organisations (or property managers) — not residential renters. Occupants and applicants have separate desks."
      />
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Landlord orgs", value: String(kpi.landlords) },
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
        {cards.map((card) => {
          const Icon = iconForHref(card.href)
          return (
            <Link
              key={card.href}
              href={card.href}
              className="flex gap-4 border border-ink/10 bg-card p-5 transition-colors hover:border-terra/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-terra/25 bg-accent text-terra">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <h2 className="font-serif text-xl font-semibold">{card.title}</h2>
                <p className="mt-2 text-sm text-ink-soft">{card.body}</p>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

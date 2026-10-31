import Link from "next/link"
import { PageHeader } from "@/components/product"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { listAllIndications, platformAnalytics } from "@/lib/db"
import { money } from "@/lib/format"
import {
  billingAdapterStatus,
  countrySchemaSnapshot,
  esignAdapterStatus,
  kycAdapterStatus,
  listAskEasyMemoryStats,
  listOpsFlags,
  listPlatformSubscriptions,
  otpAdapterStatus,
} from "@/lib/platform-ops"
import { listPartnerApplications } from "@/lib/partners/store"

export const metadata = { title: "L0 command center" }

export default async function ConsoleHomePage() {
  await requirePlatformAdmin()
  const kpi = platformAnalytics()
  const subs = listPlatformSubscriptions()
  const activeSubs = subs.filter((s) => ["active", "trialing", "past_due"].includes(s.status)).length
  const partners = listPartnerApplications().filter((a) => a.status !== "rejected" && a.status !== "active")
  const indications = listAllIndications()
  const memoryTenants = listAskEasyMemoryStats()
  const flagsOn = listOpsFlags().filter((f) => f.on).length
  const schema = countrySchemaSnapshot()
  const adapters = [
    ...billingAdapterStatus(),
    ...otpAdapterStatus(),
    ...kycAdapterStatus(),
    ...esignAdapterStatus().slice(0, 1),
  ]

  const cards = [
    { href: "/console/tenants", title: "Tenants / orgs", body: "Suspend, package, impersonate landlord admins.", meta: `${kpi.landlords} landlords` },
    { href: "/console/billing", title: "Subscriptions", body: "Billing rows + MoR adapter health across tenants.", meta: `${activeSubs} paying` },
    { href: "/console/listings", title: "Listings inventory", body: "Publish / hide units platform-wide.", meta: `${kpi.listings} units` },
    { href: "/console/identity", title: "KYC / OTP ops", body: "Provider mode, live flags, key presence.", meta: adapters.filter((a) => a.id.startsWith("otp") || a.id === "kyc").map((a) => a.mode).join(" · ") },
    { href: "/console/esign", title: "eSign adapters", body: "Digio / eMudhra / demo status.", meta: esignAdapterStatus()[0]?.mode ?? "—" },
    { href: "/console/markets", title: "Markets / schema", body: `Live ${schema.liveIso} · start country checklist drafts.`, meta: schema.currency },
    { href: "/console/partners", title: "Partner network", body: "Affiliate + service vet queue (real store).", meta: `${partners.length} in queue` },
    { href: "/console/referrals", title: "Refer & Earn", body: "Advance indications · demo INR rewards.", meta: `${indications.length} leads` },
    { href: "/console/ask-easy", title: "Ask Easy memory", body: "DPDP purge per landlord org.", meta: `${memoryTenants.reduce((n, t) => n + t.count, 0)} rows` },
    { href: "/console/flags", title: "Feature flags", body: "Durable ops toggles (meta-backed).", meta: `${flagsOn}/${listOpsFlags().length} on` },
    { href: "/console/providers", title: "Service providers", body: "Verify trades + landlord approvals.", meta: `${kpi.providers} providers` },
    { href: "/console/pricing", title: "Pricing packages", body: "Basic / Growth / Pro entitlements.", meta: "per tenant" },
    { href: "/console/shops", title: "Shops catalog", body: "SKU enable across landlord tenants.", meta: money(kpi.shopGmvCents) },
    { href: "/console/analytics", title: "Analytics", body: "Listings, applications, visits, GMV.", meta: money(kpi.ledgerGmvCents) },
  ]

  return (
    <div data-testid="l0-command-center">
      <PageHeader
        kicker="Easy Rental · navy / cyan"
        title="L0 command center"
        lede="Real platform controls — tenants, billing, inventory, identity, eSign, markets, partners, Ask Easy, and flags. No stub desks."
      />
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Landlords", value: String(kpi.landlords) },
          { label: "Listings", value: String(kpi.listings) },
          { label: "Paying seats", value: String(activeSubs) },
          { label: "Ledger GMV", value: money(kpi.ledgerGmvCents) },
        ].map((item) => (
          <div
            key={item.label}
            className="border border-brand/15 bg-gradient-to-br from-brand/[0.06] to-terra/[0.08] px-4 py-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">{item.label}</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-brand">{item.value}</p>
          </div>
        ))}
      </div>

      <section className="mb-8" aria-label="Adapter pulse">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-terra">Adapter pulse</h2>
        <div className="flex flex-wrap gap-2">
          {adapters.map((a) => (
            <span
              key={a.id}
              className="border border-brand/20 bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft"
              data-testid={`adapter-chip-${a.id}`}
            >
              {a.label}
              <span className="ml-2 text-terra">{a.mode}</span>
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group border border-brand/15 bg-card p-5 transition-colors hover:border-terra/50 hover:bg-gradient-to-br hover:from-card hover:to-terra/[0.06]"
            data-testid={`console-tile-${card.href.split("/").pop()}`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-serif text-xl font-semibold text-brand group-hover:text-terra-dark">
                {card.title}
              </h2>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-terra">
                {card.meta}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-soft">{card.body}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

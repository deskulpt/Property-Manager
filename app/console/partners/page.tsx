import Link from "next/link"
import { PageHeader, StatusBadge } from "@/components/product"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { listPartnerApplications, listPartnerReferrals } from "@/lib/partners/store"

export const metadata = { title: "Partners · Console" }

export default async function ConsolePartnersPage() {
  await requirePlatformAdmin()
  const apps = listPartnerApplications()
  const referrals = listPartnerReferrals().slice(0, 8)
  return (
    <div className="grid gap-10">
      <div>
        <PageHeader
          kicker="§19C"
          title="Partner affiliates"
          lede="Vetting queue for affiliate and service partners. Advance status from the CMS queue or open a record."
        />
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <Link href="/cms/partners/queue" className="font-semibold text-terra underline">
            Open vetting queue
          </Link>
          <Link href="/cms/partners" className="underline">
            Full partner directory
          </Link>
        </div>
        <div className="grid gap-3">
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/cms/partners/${app.id}`}
              className="flex flex-wrap items-center justify-between gap-3 border border-ink/10 bg-card p-4 hover:border-terra/40"
            >
              <div>
                <h2 className="font-sans text-lg font-extrabold">{app.name}</h2>
                <p className="text-sm text-ink-soft">
                  {app.track} · {app.subtype} · {app.email}
                </p>
              </div>
              <StatusBadge status={app.status === "active" ? "verified" : "pending"} />
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                {app.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-3 font-serif text-2xl font-semibold">Recent partner referrals</h2>
        <div className="grid gap-2">
          {referrals.length === 0 ? (
            <p className="text-sm text-ink-soft">No partner referrals yet.</p>
          ) : null}
          {referrals.map((row) => (
            <div key={row.id} className="border border-ink/10 bg-paper-2 px-4 py-3 text-sm">
              <p className="font-semibold">{row.referredName}</p>
              <p className="text-ink-soft">
                {row.status} · {row.track}/{row.subtype} · from {row.referrerName}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

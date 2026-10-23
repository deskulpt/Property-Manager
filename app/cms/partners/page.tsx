import Link from "next/link"
import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { listPartnerApplications } from "@/lib/partners/store"
import { canOpenCms } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Partner directory" }

export default async function CmsPartnersPage() {
  const user = await getSessionUser()
  if (
    !user ||
    !canOpenCms(user.role) ||
    !["super_admin", "account_manager", "service_manager"].includes(user.role)
  ) {
    return (
      <EmptyState
        title="Partner CMS"
        body="Switch to Avery (Super Admin), Sam (Account Manager), or Priya (Service Manager)."
      />
    )
  }
  const apps = listPartnerApplications()
  return (
    <div>
      <PageHeader
        kicker="§19C"
        title="Partner directory"
        lede="Active and in-flight affiliate + service applications. Open the queue for status work."
      />
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/cms/partners/queue" className="text-terra underline">
          Vet queue
        </Link>
        <Link href="/cms/partners/referrals" className="text-terra underline">
          Partner referrals
        </Link>
      </div>
      <div className="grid gap-3">
        {apps.map((app) => (
          <Link
            key={app.id}
            href={`/cms/partners/${app.id}`}
            className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 ring-1 ring-foreground/10 hover:ring-terra/40"
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
  )
}

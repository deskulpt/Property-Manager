import Link from "next/link"
import { EmptyState, PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { submitPartnerAdvance } from "@/lib/partners/actions"
import { PARTNER_STATUS_NEXT } from "@/lib/partners/types"
import { listPartnerApplications } from "@/lib/partners/store"
import { canOpenCms } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Partner vet queue" }

export default async function PartnerQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; status?: string }>
}) {
  const user = await getSessionUser()
  if (
    !user ||
    !canOpenCms(user.role) ||
    !["super_admin", "account_manager", "service_manager"].includes(user.role)
  ) {
    return <EmptyState title="Vet queue" body="Staff only — Avery, Sam, or Priya." />
  }
  const sp = await searchParams
  const apps = listPartnerApplications({
    track: sp.track === "affiliate" || sp.track === "service" ? sp.track : undefined,
    status: sp.status as never,
  }).filter((a) => a.status !== "rejected")

  return (
    <div>
      <PageHeader
        kicker="CMS"
        title="Vetting queue"
        lede="Advance applied → docs_review → id_check → area_approval → active. Demo ID toggles on the detail page."
      />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/cms/partners/queue" className="underline">
          All
        </Link>
        <Link href="/cms/partners/queue?track=service" className="underline">
          Services
        </Link>
        <Link href="/cms/partners/queue?track=affiliate" className="underline">
          Affiliates
        </Link>
      </div>
      <div className="grid gap-3">
        {apps.map((app) => {
          const next = PARTNER_STATUS_NEXT[app.status]
          return (
            <article
              key={app.id}
              className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 ring-1 ring-foreground/10"
            >
              <div>
                <Link href={`/cms/partners/${app.id}`} className="font-sans text-lg font-extrabold hover:text-terra">
                  {app.name}
                </Link>
                <p className="text-sm text-ink-soft">
                  {app.track}/{app.subtype} · <span className="font-mono uppercase">{app.status}</span>
                </p>
              </div>
              {next ? (
                <form action={submitPartnerAdvance}>
                  <input type="hidden" name="id" value={app.id} />
                  <input type="hidden" name="to" value={next} />
                  <SubmitButton pendingLabel="…">Advance → {next}</SubmitButton>
                </form>
              ) : (
                <Link href={`/cms/partners/${app.id}`} className="text-sm text-terra underline">
                  Open
                </Link>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

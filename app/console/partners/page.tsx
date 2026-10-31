import Link from "next/link"
import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { submitPartnerAdvance } from "@/lib/partners/actions"
import { listPartnerApplications, partnerNetworkEnabled } from "@/lib/partners/store"
import { PARTNER_STATUS_NEXT } from "@/lib/partners/types"

export const metadata = { title: "Partners · Command center" }

export default async function ConsolePartnersPage() {
  await requirePlatformAdmin()
  const enabled = partnerNetworkEnabled()
  const apps = listPartnerApplications().filter((a) => a.status !== "rejected")
  const queue = apps.filter((a) => a.status !== "active")

  return (
    <div data-testid="console-partners">
      <PageHeader
        kicker="§19C"
        title="Partner network"
        lede="Affiliate and service-provider applications from the live partner store. Advance the vet pipeline or open CMS detail."
      />
      {!enabled ? (
        <p className="mb-4 border border-pending/30 bg-pending/10 px-3 py-2 text-sm text-ink-soft">
          Partner network flag is off. Turn it on under{" "}
          <Link href="/console/flags" className="font-semibold text-terra underline">
            Flags
          </Link>
          .
        </p>
      ) : null}
      {apps.length === 0 ? (
        <EmptyState
          title="No partner applications"
          body="When partners apply on /partners/apply or /partners/services/apply, they land here for vetting."
          action={{ href: "/partners/apply", label: "Open public partner apply" }}
        />
      ) : (
        <>
          <p className="mb-4 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            {queue.length} in vet queue · {apps.length - queue.length} active
          </p>
          <div className="grid gap-3">
            {apps.map((app) => {
              const next = PARTNER_STATUS_NEXT[app.status]
              return (
                <article
                  key={app.id}
                  className="flex flex-wrap items-center justify-between gap-3 border border-brand/15 bg-card p-4"
                >
                  <div>
                    <Link
                      href={`/cms/partners/${app.id}`}
                      className="font-serif text-lg font-semibold text-brand hover:text-terra"
                    >
                      {app.name}
                    </Link>
                    <p className="text-sm text-ink-soft">
                      {app.track}/{app.subtype} · {app.email}
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                      {app.status} · id-check {app.idCheckResult}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={app.status === "active" ? "verified" : "pending"} />
                    {next ? (
                      <form action={submitPartnerAdvance}>
                        <input type="hidden" name="id" value={app.id} />
                        <input type="hidden" name="to" value={next} />
                        <SubmitButton variant="outline" pendingLabel="…">
                          Advance → {next}
                        </SubmitButton>
                      </form>
                    ) : (
                      <Link href={`/cms/partners/${app.id}`} className="text-sm text-terra underline">
                        Open detail
                      </Link>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

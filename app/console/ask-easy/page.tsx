import Link from "next/link"
import { EmptyState, PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { consolePurgeAskEasyMemory } from "@/lib/actions"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { formatDay } from "@/lib/format"
import { isOpsFlagOn, listAskEasyMemoryStats } from "@/lib/platform-ops"

export const metadata = { title: "Ask Easy · Command center" }

export default async function ConsoleAskEasyPage() {
  await requirePlatformAdmin()
  const stats = listAskEasyMemoryStats()
  const on = isOpsFlagOn("ask_easy")

  return (
    <div data-testid="console-ask-easy">
      <PageHeader
        kicker="DPDP ops"
        title="Ask Easy memory purge"
        lede="Per-landlord durable memory. L0 can purge an org for erasure requests. Never stores raw Aadhaar or full cards."
      />
      {!on ? (
        <p className="mb-4 border border-pending/30 bg-pending/10 px-3 py-2 text-sm">
          Ask Easy platform flag is off —{" "}
          <Link href="/console/flags" className="font-semibold text-terra underline">
            Flags
          </Link>
          .
        </p>
      ) : null}
      {stats.length === 0 ? (
        <EmptyState
          title="No memory rows"
          body="Landlords create memory via Ask Easy on the desk. Nothing to purge."
          action={{ href: "/landlord/ask", label: "Landlord Ask Easy" }}
        />
      ) : (
        <div className="grid gap-3">
          {stats.map((row) => (
            <article
              key={row.tenantId}
              className="flex flex-wrap items-center justify-between gap-3 border border-brand/15 bg-card p-4"
            >
              <div>
                <h2 className="font-serif text-lg font-semibold">{row.tenantName}</h2>
                <p className="text-sm text-ink-soft">
                  {row.count} row{row.count === 1 ? "" : "s"}
                  {row.latestAt ? ` · updated ${formatDay(row.latestAt.slice(0, 10))}` : ""}
                </p>
              </div>
              <form action={consolePurgeAskEasyMemory}>
                <input type="hidden" name="tenantId" value={row.tenantId} />
                <SubmitButton variant="outline" pendingLabel="Purging…">
                  Purge all memory
                </SubmitButton>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

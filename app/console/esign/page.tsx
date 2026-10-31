import { PageHeader } from "@/components/product"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { esignAdapterStatus } from "@/lib/platform-ops"

export const metadata = { title: "eSign · Command center" }

export default async function ConsoleEsignPage() {
  await requirePlatformAdmin()
  const rows = esignAdapterStatus()

  return (
    <div data-testid="console-esign">
      <PageHeader
        kicker="Lease onboard"
        title="eSign adapters"
        lede="Digio / eMudhra for India; DocuSign reserved for CA/US. Live HTTP stays off unless ESIGN_LIVE=1 (still needs transport)."
      />
      <div className="grid gap-3">
        {rows.map((row) => (
          <article key={row.id} className="border border-brand/15 bg-card p-4" data-testid={`esign-${row.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold text-brand">{row.label}</h2>
              <span className="font-mono text-[11px] uppercase tracking-wider text-terra">{row.mode}</span>
            </div>
            <p className="mt-2 text-sm text-ink-soft">{row.detail}</p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              Env: {row.envHints.join(" · ")}
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}

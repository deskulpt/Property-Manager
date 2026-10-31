import Link from "next/link"
import { EmptyState, PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { consoleDemoteCountryPack, consolePromoteCountryPack } from "@/lib/actions"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { listMarketDrafts } from "@/lib/db"
import { activeMarket } from "@/lib/market"
import { listCountryPacks } from "@/lib/markets/store"
import { StartMarketDraftForm } from "@/components/cms/start-market-draft"

export const metadata = { title: "Markets · Command center" }

export default async function ConsoleMarketsPage() {
  await requirePlatformAdmin()
  const packs = listCountryPacks()
  const drafts = listMarketDrafts()
  const live = activeMarket()

  return (
    <div data-testid="console-markets">
      <PageHeader
        kicker="Country schema"
        title="Markets & packs"
        lede="Promote CountryPack rows to live schema (currency, tax, payments, eSign, SMS). Checklist drafts alone do not switch the business schema — promote does."
      />

      <section className="mb-8 border border-brand/15 bg-gradient-to-br from-brand/[0.05] to-terra/[0.08] p-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-terra">Active runtime pack</p>
        <p className="mt-1 font-serif text-2xl font-semibold text-brand">
          {live.name} ({live.id})
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          {live.currency} · {live.gstLabel} · {live.phoneCountryCode} · {live.pinLabel} · payments{" "}
          {live.primaryPaymentMethods.map((m) => m.label).join(", ")}
        </p>
        <p className="mt-2 text-xs text-ink-faint">
          Header flag uses live packs only. No <code className="font-mono">/ca/*</code> shard.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-xl font-semibold text-brand">Country packs</h2>
        <div className="grid gap-3">
          {packs.map((row) => (
            <article
              key={row.iso}
              className="flex flex-wrap items-start justify-between gap-3 border border-brand/15 bg-card p-4"
              data-testid={`country-pack-${row.iso}`}
            >
              <div>
                <h3 className="font-serif text-lg font-semibold">
                  {row.name} ({row.iso})
                </h3>
                <p className="font-mono text-[11px] uppercase tracking-wider text-terra">{row.status}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {row.pack.currency} · tax {row.pack.gstBps} bps · MoR {row.pack.platformMoR.domestic}
                  {row.pack.platformMoR.intl ? ` / intl ${row.pack.platformMoR.intl}` : ""} · eSign{" "}
                  {row.pack.esignProviders.join(", ")} · SMS {row.pack.smsProvider}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.status !== "live" ? (
                  <form action={consolePromoteCountryPack}>
                    <input type="hidden" name="iso" value={row.iso} />
                    <SubmitButton pendingLabel="Promoting…">Promote to live</SubmitButton>
                  </form>
                ) : row.iso !== "IN" ? (
                  <form action={consoleDemoteCountryPack}>
                    <input type="hidden" name="iso" value={row.iso} />
                    <SubmitButton variant="outline" pendingLabel="…">
                      Demote to ready
                    </SubmitButton>
                  </form>
                ) : (
                  <span className="font-mono text-[11px] uppercase tracking-wider text-avail">
                    Always live
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-2 font-serif text-xl font-semibold text-brand">Checklist drafts</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Drafts track readiness notes. Completing every row marks a pack <em>ready</em> for promote —
          it does <strong>not</strong> by itself load MarketProfile / tax / gateways.
        </p>
        <StartMarketDraftForm
          labels={{ iso: "ISO", name: "Display name", submit: "Start draft" }}
        />
        {drafts.length === 0 ? (
          <EmptyState
            title="No checklist drafts"
            body="Start a draft above, or promote the seeded Canada pack when legal copy is ready."
          />
        ) : (
          <ul className="mt-4 grid gap-2">
            {drafts.map((draft) => (
              <li key={draft.id}>
                <Link
                  href={`/cms/markets/${draft.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 border border-brand/10 bg-card px-4 py-3 hover:border-terra/40"
                >
                  <span className="font-semibold">
                    {draft.name} ({draft.isoCode})
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    {draft.doneCount}/{draft.totalCount}
                    {draft.complete ? " · ready for promote" : " · incomplete"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

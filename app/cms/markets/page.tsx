import Link from "next/link"
import { PageHeader, RoleGate } from "@/components/product"
import { StartMarketDraftForm } from "@/components/cms/start-market-draft"
import { listMarketDrafts } from "@/lib/db"
import { t } from "@/lib/i18n"
import { LIVE_MARKET } from "@/lib/market-checklist"
import { staffCapabilities } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Next-market checklist" }

export default async function CmsMarketsPage() {
  const user = await getSessionUser()
  const caps = user ? staffCapabilities(user.role) : null
  if (!caps?.manageMarkets) {
    return (
      <RoleGate
        title="Next-market checklist"
        body="Sign in as Avery Quinn (Super Admin) — or impersonate from the L0 sticky bar — to start draft countries and work the checklist."
      />
    )
  }
  const drafts = listMarketDrafts()
  return (
    <div>
      <PageHeader
        kicker="Markets · CountryPack"
        title={t("cms.markets.title")}
        lede="India is the only live MarketProfile. Parked ISOs (CA/US/BR/GB) need L0 allowParked for a checklist draft — complete ≠ promote. Header CA stays parked until CountryPack."
      />
      <section className="mb-8 rounded-sm border border-base-300 bg-base-100 p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-secondary">{t("cms.markets.live")}</p>
        <p className="mt-1 font-serif text-xl font-semibold text-primary">
          {LIVE_MARKET.name} ({LIVE_MARKET.iso})
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          INR ledger · GST 18% · +91 · UPI/eNACH demo · always on public forms.
        </p>
        <div className="alert alert-warning mt-3 rounded-sm py-2 text-sm">
          <span>
            Canada is <strong>parked</strong> until CountryPack promote. Do not claim a live CA schema from
            checklist alone.
          </span>
        </div>
      </section>
      <section className="mb-8">
        <h2 className="mb-3 font-sans text-lg font-extrabold">{t("cms.markets.start")}</h2>
        <StartMarketDraftForm
          labels={{
            iso: t("cms.markets.iso"),
            name: t("cms.markets.name"),
            submit: t("cms.markets.start"),
          }}
        />
      </section>
      {drafts.length === 0 ? (
        <p className="text-sm text-ink-soft">{t("cms.markets.empty")}</p>
      ) : (
        <ul className="grid gap-3">
          {drafts.map((draft) => (
            <li key={draft.id}>
              <Link
                href={`/cms/markets/${draft.id}`}
                className="flex flex-wrap items-center justify-between gap-2 bg-card px-4 py-3 ring-1 ring-foreground/10 hover:ring-brand/40"
              >
                <span>
                  <span className="font-sans text-lg font-extrabold">
                    {draft.name} ({draft.isoCode})
                  </span>
                  <span className="mt-1 block font-mono text-[11px] text-ink-faint">
                    {draft.doneCount}/{draft.totalCount} rows
                  </span>
                </span>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider ${draft.complete ? "text-avail" : "text-terra"}`}
                >
                  {draft.complete ? t("cms.markets.ready") : t("cms.markets.incomplete")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

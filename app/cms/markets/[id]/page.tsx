import Link from "next/link"
import { notFound } from "next/navigation"
import { ChecklistRows } from "@/components/cms/checklist-rows"
import { PageHeader, RoleGate } from "@/components/product"
import { getMarketDraft } from "@/lib/db"
import { t } from "@/lib/i18n"
import { staffCapabilities } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Market checklist" }

export default async function CmsMarketDraftPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getSessionUser()
  const caps = user ? staffCapabilities(user.role) : null
  if (!caps?.manageMarkets) {
    return (
      <RoleGate
        title="Next-market checklist"
        body="Sign in as Avery Quinn (Super Admin) — or impersonate from the L0 sticky bar — to edit draft market checklists."
      />
    )
  }
  const { id } = await params
  const draft = getMarketDraft(id)
  if (!draft) notFound()

  return (
    <div>
      <p className="mb-2">
        <Link href="/cms/markets" className="text-sm font-bold text-brand">
          ← {t("cms.markets.title")}
        </Link>
      </p>
      <PageHeader
        kicker={draft.isoCode}
        title={draft.name}
        lede={
          draft.complete
            ? t("cms.markets.ready")
            : `${t("cms.markets.incomplete")} · ${draft.doneCount}/${draft.totalCount}`
        }
      />
      <ChecklistRows
        draftId={draft.id}
        items={draft.items}
        labels={{
          save: t("cms.markets.save_row"),
          markDone: t("cms.markets.mark_done"),
          markOpen: t("cms.markets.mark_open"),
        }}
      />
    </div>
  )
}

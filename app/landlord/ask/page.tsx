import { AskEasyPanel } from "@/components/landlord/ask-easy-panel"
import { PageHeader } from "@/components/product"
import {
  askEasyGateReason,
  auditEventsForTenant,
  listingDraftsForTenant,
  liveModelConfigured,
  pendingProposals,
  runAskEasyStub,
} from "@/lib/agentic"
import { listPortfolio } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Ask Easy" }

export default async function AskEasyPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const tenantId = user.tenantId
  const gated = askEasyGateReason(tenantId) === "upgrade"
  const properties = listPortfolio()
    .filter((property) => property.tenantId === tenantId)
    .map((property) => ({
      id: property.id,
      name: property.name,
      units: property.units.map((unit) => ({ id: unit.id, code: unit.code })),
    }))

  const onboardSeed =
    !gated && properties.length > 0
      ? (() => {
          const turn = runAskEasyStub({
            tenantId,
            userId: user.id,
            prompt: "Onboard me — summarise my portfolio",
            propertyId: properties[0]?.id,
            onboard: true,
          })
          if (turn.kind === "error") return undefined
          return {
            reply: turn.reply,
            citations: turn.citations,
            toolName: turn.toolName ?? null,
          }
        })()
      : undefined

  return (
    <div>
      <PageHeader
        kicker="Ask Easy"
        title="Landlord assistant"
        lede="Unified desk path: text or voice onboard that reads real listing attributes from SQLite, plus approval-gated mutations. Stub works offline; optional Gemini / model keys when set. Public catalog chat stays at /ask."
      />
      <AskEasyPanel
        gated={gated}
        properties={properties}
        pending={gated ? [] : pendingProposals(tenantId)}
        drafts={gated ? [] : listingDraftsForTenant(tenantId)}
        audit={gated ? [] : auditEventsForTenant(tenantId)}
        modelMode={liveModelConfigured() ? "live-ready" : "stub"}
        onboardSeed={onboardSeed}
      />
    </div>
  )
}

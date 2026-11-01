import { Suspense } from "react"
import { AskEasyIsland } from "@/components/ask-easy/ask-easy-island"
import {
  askEasyGateReason,
  listingDraftsForTenant,
  liveModelConfigured,
  pendingProposals,
  runAskEasyStub,
} from "@/lib/agentic"
import { listPortfolio } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

/**
 * Server host for the landlord Ask Easy floating island.
 * Soft-open gate matches tip `askEasyGateReason` — does not invent D02 entitlements.
 */
export async function AskEasyIslandHost() {
  const user = await getSessionUser()
  if (!user?.tenantId || user.role !== "landlord_admin") return null

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
    <Suspense fallback={null}>
      <AskEasyIsland
        gated={gated}
        properties={properties}
        pending={gated ? [] : pendingProposals(tenantId)}
        drafts={gated ? [] : listingDraftsForTenant(tenantId)}
        modelMode={liveModelConfigured() ? "live-ready" : "stub"}
        onboardSeed={onboardSeed}
      />
    </Suspense>
  )
}

import { AskDeskulptPanel } from "@/components/agentic/ask-deskulpt-panel"
import { PageHeader } from "@/components/product"
import { listAudits, listDrafts, listProposals } from "@/lib/agentic/queue"
import { getTenantPackage } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Ask DeSkulpt" }

export default async function AskDeskulptPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const packageTier = user.tenantPackage ?? getTenantPackage(user.tenantId)
  const proposals = listProposals(user.tenantId)
  const audits = listAudits(user.tenantId)
  const drafts = listDrafts(user.tenantId)

  return (
    <div>
      <PageHeader
        kicker="Slice L.0 · PRD §21"
        title="Ask DeSkulpt"
        lede="Stub agent proposes tools; you approve before any job, notify, or publish. No live LLM and no @cursor/bdk dependency."
      />
      <AskDeskulptPanel
        packageTier={packageTier ?? "starter"}
        proposals={proposals}
        audits={audits}
        drafts={drafts}
      />
    </div>
  )
}

import { AskDeskulptPanel } from "@/components/agentic/ask-deskulpt-panel"
import { PageHeader } from "@/components/product"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Ask DeSkulpt" }

export default async function AskDeskulptPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  return (
    <div>
      <PageHeader
        kicker="Agentic (scaffold)"
        title="Ask DeSkulpt"
        lede="Proposed actions land in an approval queue. Wire to PRD §21 when that section lands — no live model required for this stub."
      />
      <AskDeskulptPanel tenantId={user.tenantId} />
    </div>
  )
}

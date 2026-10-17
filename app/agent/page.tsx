import Link from "next/link"
import { setAgentLandlordForm } from "@/lib/actions"
import { agentLandlords, resolveAgentTenantId } from "@/lib/agent-context"
import { PageHeader } from "@/components/product"
import { getSessionUser } from "@/lib/session"
import { SubmitButton } from "@/components/submit-button"

export const metadata = { title: "Managing agent" }

export default async function AgentHomePage() {
  const user = await getSessionUser()
  if (!user || user.role !== "managing_agent") return null
  const landlords = agentLandlords(user.id)
  const current = await resolveAgentTenantId(user.id)

  return (
    <div>
      <PageHeader
        kicker="Portfolio"
        title="Managed landlords"
        lede="Pick a landlord context, then import a listing URL into that organisation’s draft inventory."
      />
      <ul className="grid gap-3">
        {landlords.map((landlord) => (
          <li key={landlord.id} className="border border-ink/10 bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg font-semibold">{landlord.name}</h2>
                <p className="text-sm text-ink-soft">
                  {landlord.city} · {landlord.propertyCount} properties
                  {current === landlord.id ? " · active context" : ""}
                </p>
              </div>
              <form action={setAgentLandlordForm}>
                <input type="hidden" name="tenantId" value={landlord.id} />
                <SubmitButton pendingLabel="Switching…">
                  {current === landlord.id ? "Selected" : "Work in this org"}
                </SubmitButton>
              </form>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm">
        <Link href="/agent/import" className="font-semibold text-terra hover:underline">
          Import listing into the active landlord →
        </Link>
      </p>
    </div>
  )
}

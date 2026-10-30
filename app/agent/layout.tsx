import { PortalFrame } from "@/components/portal-frame"
import { RoleGate } from "@/components/product"
import { agentLandlords, resolveAgentTenantId } from "@/lib/agent-context"
import { getSessionUser } from "@/lib/session"

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || user.role !== "managing_agent") {
    return (
      <RoleGate
        title="Managing agent desk"
        body="Sign in as managing agent Riya Kapoor, or impersonate her from the L0 sticky bar. Managing agents only see invited landlords — not platform staff Property Manager."
        action={{ href: "/login?next=/agent", label: "Log in" }}
      />
    )
  }
  const landlords = agentLandlords(user.id)
  const tenantId = await resolveAgentTenantId(user.id)
  const current = landlords.find((l) => l.id === tenantId) ?? null
  const links = [
    { href: "/agent", label: "Landlords" },
    { href: "/agent/import", label: "Import listing" },
  ]
  return (
    <PortalFrame
      kicker="Managing agent"
      title={current ? current.name : "Select a landlord"}
      links={links}
    >
      {children}
    </PortalFrame>
  )
}

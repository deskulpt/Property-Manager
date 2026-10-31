import { PortalFrame } from "@/components/portal-frame"
import { RoleGate } from "@/components/product"
import { agentLandlords, resolveAgentTenantId } from "@/lib/agent-context"
import { getSessionUser } from "@/lib/session"

/** Full L3 powers — docs/full-funnel-ia.md §6. Floors/CAD via listings → building. */
const links = [
  { href: "/agent", label: "Landlords", primary: true },
  { href: "/agent/applications", label: "Applications", primary: true },
  { href: "/agent/listings", label: "Floors & listings", primary: true },
  { href: "/agent/import", label: "Import", primary: true },
  { href: "/agent/pricing", label: "Pricing" },
]

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

  return (
    <PortalFrame
      kicker="Managing agent · L3"
      title={current ? current.name : "Select a landlord"}
      links={links}
      role="l3"
    >
      {children}
    </PortalFrame>
  )
}

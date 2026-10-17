import { PortalFrame } from "@/components/portal-frame"
import { RoleGate } from "@/components/product"
import { resolveAgentTenantId } from "@/lib/agent-context"
import {
  agentLandlords,
  pendingApplicationCount,
} from "@/lib/role-cms-store"
import { getSessionUser } from "@/lib/session"

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || user.role !== "managing_agent") {
    return (
      <RoleGate
        title="Managing agent desk"
        body="Switch to Riya Kapoor in the identity switcher. Managing agents only see landlords they are invited to collaborate on — not platform staff Property Manager (Chris Vogel)."
      />
    )
  }
  const landlords = agentLandlords(user.id)
  const tenantId = await resolveAgentTenantId(user.id)
  const current = landlords.find((l) => l.id === tenantId) ?? null
  const pending = tenantId ? pendingApplicationCount(tenantId) : 0
  const links = [
    { href: "/agent", label: "Landlords" },
    { href: "/agent/applications", label: "Applications", badge: pending },
    { href: "/agent/listings", label: "Listings" },
    { href: "/agent/pricing", label: "Pricing" },
    { href: "/profile", label: "Profile" },
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

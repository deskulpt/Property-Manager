import { PortalFrame } from "@/components/portal-frame"
import { RoleGate } from "@/components/product"
import { getSessionUser } from "@/lib/session"

const links = [
  { href: "/landlord", label: "Overview" },
  { href: "/landlord/properties", label: "Properties" },
  { href: "/landlord/applications", label: "Applications" },
  { href: "/landlord/jobs", label: "Concierge" },
  { href: "/landlord/providers", label: "Providers" },
  { href: "/landlord/ledger", label: "Ledger" },
]

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return (
      <RoleGate
        title="This desk is for a landlord admin"
        body="Switch to Nadia Okonkwo for BBM Waterman, or Jonah Ellis for Harbourline Yards. Each one only sees their own organisation."
      />
    )
  }
  return (
    <PortalFrame kicker="Landlord" title={user.tenantName ?? "Portfolio"} links={links}>
      {children}
    </PortalFrame>
  )
}

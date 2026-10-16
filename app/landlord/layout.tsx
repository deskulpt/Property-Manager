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
  { href: "/landlord/settings", label: "Settings" },
]

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return (
      <RoleGate
        title="This desk is for a landlord admin"
        body="Create an account at Sign up, log in, or use the Demo identity switcher (Nadia for BBM, Jonah for Harbourline, Meera for Sahni NRI). Each organisation only sees its own data."
      />
    )
  }
  return (
    <PortalFrame kicker="Landlord" title={user.tenantName ?? "Portfolio"} links={links}>
      {children}
    </PortalFrame>
  )
}

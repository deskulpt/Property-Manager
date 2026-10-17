import { PortalFrame } from "@/components/portal-frame"
import { RoleGate } from "@/components/product"
import { pendingApplicationCount } from "@/lib/role-cms-store"
import { getSessionUser } from "@/lib/session"

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return (
      <RoleGate
        title="This desk is for a landlord admin"
        body="Create an account at Sign up, log in, or use the identity switcher (Nadia for BBM, Jonah for Harbourline, Meera for Sahni NRI). Each organisation only sees its own data."
      />
    )
  }
  const pending = pendingApplicationCount(user.tenantId)
  const links = [
    { href: "/landlord", label: "Overview" },
    { href: "/landlord/listings", label: "Listings" },
    { href: "/landlord/properties", label: "Properties" },
    { href: "/landlord/applications", label: "Applications", badge: pending },
    { href: "/landlord/visits", label: "Visits" },
    { href: "/landlord/jobs", label: "Concierge" },
    { href: "/landlord/providers", label: "Providers" },
    { href: "/landlord/ledger", label: "Ledger" },
    { href: "/agreements/new", label: "Agreements" },
    { href: "/landlord/shop", label: "Shop" },
    { href: "/landlord/settings", label: "Settings" },
    { href: "/profile", label: "Profile" },
  ]
  return (
    <PortalFrame kicker="Landlord" title={user.tenantName ?? "Portfolio"} links={links}>
      {children}
    </PortalFrame>
  )
}

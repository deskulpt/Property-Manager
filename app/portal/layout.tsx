import { PortalFrame } from "@/components/portal-frame"
import { RoleGate } from "@/components/product"
import { activeLeasesForUser } from "@/lib/role-cms-store"
import { getSessionUser } from "@/lib/session"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  const leases = user ? activeLeasesForUser(user.id) : []
  if (!user || leases.length === 0) {
    return (
      <RoleGate
        title="Occupant portal"
        body="This desk is for tenants with an approved lease. Switch to Devon Hale (Unit A1 at BBM) to open tickets, dues, shop, and documents."
      />
    )
  }
  const links = [
    { href: "/portal", label: "Home" },
    { href: "/portal/tickets", label: "Tickets" },
    { href: "/portal/payments", label: "Payments" },
    { href: "/shop", label: "Shop" },
    { href: "/portal/documents", label: "Documents" },
    { href: "/profile", label: "Profile" },
  ]
  return (
    <PortalFrame kicker="Occupant" title={leases[0].propertyName} links={links}>
      {children}
    </PortalFrame>
  )
}

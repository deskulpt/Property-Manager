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
        body="This desk is for occupants with an approved lease. Sign in as Devon Hale (devon@northline.example) or impersonate that identity from the L0 sticky bar after logging in as SuperAdmin."
        action={{ href: "/login?next=/portal", label: "Log in" }}
      />
    )
  }
  const links = [
    { href: "/portal", label: "Home", primary: true },
    { href: "/portal/payments", label: "Payments", primary: true },
    { href: "/portal/tickets", label: "Tickets", primary: true },
    { href: "/shop", label: "Shop", primary: true },
    { href: "/portal/ledger", label: "Ledger" },
    { href: "/portal/documents", label: "Documents" },
    { href: "/profile", label: "Profile" },
  ]
  return (
    <PortalFrame kicker="Occupant · L4" title={leases[0].propertyName} links={links} role="l4">
      {children}
    </PortalFrame>
  )
}

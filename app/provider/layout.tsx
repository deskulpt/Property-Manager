import { PortalFrame } from "@/components/portal-frame"
import { RoleGate } from "@/components/product"
import { getSessionUser } from "@/lib/session"

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || user.role !== "service_provider") {
    return (
      <RoleGate
        title="This desk is for a service provider"
        body="Use the Demo identity switcher and pick Luis Ortega (electrician, Bhiwandi) for the seeded weather-seal job. Real provider accounts are not seeded."
      />
    )
  }
  return (
    <PortalFrame
      kicker="Provider"
      title={`${user.trade ?? "Trade"} · ${user.serviceArea ?? ""}`}
      links={[{ href: "/provider", label: "Jobs" }, { href: "/inbox", label: "Inbox" }]}
    >
      {children}
    </PortalFrame>
  )
}

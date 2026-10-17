import { PortalFrame } from "@/components/portal-frame"
import { RoleGate } from "@/components/product"
import { getSessionUser } from "@/lib/session"

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || user.role !== "service_provider") {
    return (
      <RoleGate
        title="This desk is for a service provider"
        body="Switch to Luis Ortega to accept the weather-seal job, Rosa Delgado to see a completed clean, or Kei Watanabe to see an empty board. Amrita Singh is approved at Harbourline and has nothing until Jonah assigns her."
      />
    )
  }
  return (
    <PortalFrame
      kicker="Provider"
      title={`${user.trade ?? "Trade"} · ${user.serviceArea ?? ""}`}
      links={[{ href: "/provider", label: "Jobs" }, { href: "/inbox", label: "Inbox" }]}
      accent="provider"
    >
      {children}
    </PortalFrame>
  )
}

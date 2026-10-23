import { PortalFrame } from "@/components/portal-frame"
import { RoleGate } from "@/components/product"
import { getSessionUser } from "@/lib/session"

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || user.role !== "service_provider") {
    return (
      <RoleGate
        title="L5 service provider desk"
        body="This is the L5 Service Provider desk. Demo: Luis Ortega (Bhiwandi) or Vikram Deshmukh (Hinjewadi / partner network). Public partner apply stays on /partners — activated trades land here."
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

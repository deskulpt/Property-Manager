import { PortalFrame } from "@/components/portal-frame"
import { RoleGate } from "@/components/product"
import { getSessionUser } from "@/lib/session"

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || user.role !== "service_provider") {
    return (
      <RoleGate
        title="L5 service provider desk"
        body="Sign in as a verified service provider (Luis Ortega · Bhiwandi, or Vikram Deshmukh · Hinjewadi), or impersonate from the L0 sticky bar. Public apply stays on Partners."
        action={{ href: "/login?next=/provider", label: "Log in" }}
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

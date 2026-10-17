import { PortalFrame } from "@/components/portal-frame"
import { requirePlatformAdmin } from "@/lib/console-gate"

const LINKS = [
  { href: "/console", label: "Overview" },
  { href: "/console/analytics", label: "Analytics" },
  { href: "/console/tenants", label: "Tenants" },
  { href: "/console/shops", label: "Shops" },
  { href: "/console/providers", label: "Providers" },
  { href: "/console/partners", label: "Partners" },
  { href: "/console/referrals", label: "Referrals" },
  { href: "/console/pricing", label: "Pricing" },
]

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePlatformAdmin()
  return (
    <PortalFrame
      kicker="Platform console"
      title={`${user.name} · Super Admin`}
      links={LINKS}
    >
      {children}
    </PortalFrame>
  )
}

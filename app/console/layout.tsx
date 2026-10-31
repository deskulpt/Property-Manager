import { PortalFrame } from "@/components/portal-frame"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { ROLE_LEVEL_LABEL } from "@/lib/role-level"
import { roleLabel } from "@/lib/format"

const LINKS = [
  { href: "/console", label: "Overview" },
  { href: "/console/analytics", label: "Analytics" },
  { href: "/console/tenants", label: "Tenants" },
  { href: "/console/billing", label: "Billing" },
  { href: "/console/listings", label: "Listings" },
  { href: "/console/providers", label: "Providers" },
  { href: "/console/partners", label: "Partners" },
  { href: "/console/referrals", label: "Referrals" },
  { href: "/console/pricing", label: "Pricing" },
  { href: "/console/markets", label: "Markets" },
  { href: "/console/identity", label: "KYC / OTP" },
  { href: "/console/esign", label: "eSign" },
  { href: "/console/ask-easy", label: "Ask Easy" },
  { href: "/console/flags", label: "Flags" },
  { href: "/console/shops", label: "Shops" },
]

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePlatformAdmin()
  return (
    <PortalFrame
      kicker="L0 command center"
      title={`${user.name} · ${roleLabel(user.role)} · ${ROLE_LEVEL_LABEL[user.roleLevel]}`}
      links={LINKS}
    >
      {children}
    </PortalFrame>
  )
}

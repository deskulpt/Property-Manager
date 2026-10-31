import { PortalFrame } from "@/components/portal-frame"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { ROLE_LEVEL_LABEL } from "@/lib/role-level"
import { roleLabel } from "@/lib/format"

/** L0/L1 command center — tip CountryPack + DaisyUI desk shell. */
const LINKS = [
  { href: "/console", label: "Overview", primary: true },
  { href: "/console/tenants", label: "Tenants", primary: true },
  { href: "/console/providers", label: "Providers", primary: true },
  { href: "/console/partners", label: "Partners", primary: true },
  { href: "/cms/markets", label: "Markets", primary: true },
  { href: "/console/analytics", label: "Analytics" },
  { href: "/console/billing", label: "Billing" },
  { href: "/console/listings", label: "Listings" },
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
  const role = user.roleLevel === 0 ? "l0" : "l1"
  return (
    <PortalFrame
      kicker="L0 command center"
      title={`${user.name} · ${roleLabel(user.role)} · ${ROLE_LEVEL_LABEL[user.roleLevel]}`}
      links={LINKS}
      role={role}
    >
      {children}
    </PortalFrame>
  )
}

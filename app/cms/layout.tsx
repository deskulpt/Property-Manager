import { PortalFrame } from "@/components/portal-frame"
import { RoleGate } from "@/components/product"
import { canOpenCms, type PersonaKind, staffCapabilities } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"
import { roleLabel } from "@/lib/format"

const ALL_LINKS: { href: string; label: string; kind?: PersonaKind | "home" }[] = [
  { href: "/cms", label: "Overview", kind: "home" },
  { href: "/cms/staff", label: "Platform staff", kind: "platform_staff" },
  { href: "/cms/landlords", label: "Landlords", kind: "landlords" },
  { href: "/cms/applicants", label: "Applicants", kind: "applicants" },
  { href: "/cms/providers", label: "Providers", kind: "providers" },
  { href: "/cms/partners", label: "Partners", kind: "providers" },
  { href: "/cms/partners/queue", label: "Partner queue", kind: "providers" },
  { href: "/cms/referrals", label: "Refer & Earn", kind: "referrals" },
  { href: "/cms/listings", label: "Listings CMS", kind: "listings" },
  { href: "/cms/markets", label: "Markets", kind: "markets" },
  { href: "/cms/languages", label: "Languages", kind: "languages" },
]

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || !canOpenCms(user.role)) {
    return (
      <RoleGate
        title="Platform CMS"
        body="Staff only. Log in as L0 SuperAdmin (admindeskulpt@gmail.com) or an L1 staff account, then use the sticky bar to impersonate Avery, Sam, Priya, Chris, or Jordan when needed."
        action={{ href: "/login?next=/cms", label: "Log in" }}
      />
    )
  }
  const caps = staffCapabilities(user.role)!
  const links = ALL_LINKS.filter(
    (link) => link.kind === "home" || (link.kind && caps.personas.includes(link.kind)),
  )
  return (
    <PortalFrame
      kicker="SaaS Super Admin Org"
      title={`${roleLabel(user.role)} · Easy Rental`}
      links={links.map((l, i) => ({ ...l, primary: i < 4 }))}
      role="l1"
    >
      {children}
    </PortalFrame>
  )
}

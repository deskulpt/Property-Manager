import { PortalFrame } from "@/components/portal-frame"
import { RoleGate } from "@/components/product"
import { getSessionUser } from "@/lib/session"

export default async function ApplicantLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") {
    return (
      <RoleGate
        title="Applicant desk"
        body="Sign in as Maya Chen (in review) or Devon Hale (approved occupant) to manage applications, verification, and e-sign — or impersonate from the L0 sticky bar."
        action={{ href: "/login?next=/applicant", label: "Log in" }}
      />
    )
  }
  const links = [
    { href: "/applicant", label: "Home", primary: true },
    { href: "/applicant/applications", label: "Applications", primary: true },
    { href: "/applicant/verify", label: "ID verify", primary: true },
    { href: "/applicant/visits", label: "Visits", primary: true },
    { href: "/applicant/esign", label: "E-sign" },
    { href: "/profile", label: "Profile" },
  ]
  return (
    <PortalFrame
      kicker="Applicant · L4"
      title={user.company ?? user.name}
      links={links}
      role="l4"
    >
      {children}
    </PortalFrame>
  )
}

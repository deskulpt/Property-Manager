import { PortalFrame } from "@/components/portal-frame"
import { RoleGate } from "@/components/product"
import { getSessionUser } from "@/lib/session"

export default async function ApplicantLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") {
    return (
      <RoleGate
        title="Applicant desk"
        body="Switch to Maya Chen (in review) or Devon Hale (approved occupant) to manage applications, verification, and e-sign."
      />
    )
  }
  const links = [
    { href: "/applicant", label: "Home" },
    { href: "/applicant/applications", label: "Applications" },
    { href: "/applicant/verify", label: "ID verify" },
    { href: "/applicant/esign", label: "E-sign" },
    { href: "/applicant/visits", label: "Visits" },
    { href: "/profile", label: "Profile" },
  ]
  return (
    <PortalFrame kicker="Applicant" title={user.company ?? user.name} links={links}>
      {children}
    </PortalFrame>
  )
}

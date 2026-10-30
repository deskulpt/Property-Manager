import { PortalFrame } from "@/components/portal-frame"
import { RoleGate } from "@/components/product"
import { SUBSCRIBE_PATH } from "@/lib/plans"
import { subscriptionAllowsDesk } from "@/lib/role-level"
import { getSessionUser } from "@/lib/session"

const links = [
  { href: "/landlord", label: "Overview" },
  { href: "/landlord/properties", label: "Properties" },
  { href: "/landlord/import", label: "Import listing" },
  { href: "/landlord/applications", label: "Applications" },
  { href: "/landlord/visits", label: "Visits" },
  { href: "/landlord/tickets", label: "Tickets" },
  { href: "/landlord/reminders", label: "Reminders" },
  { href: "/landlord/esign", label: "E-sign" },
  { href: "/landlord/jobs", label: "Concierge" },
  { href: "/landlord/providers", label: "Providers" },
  { href: "/landlord/ledger", label: "Ledger" },
  { href: "/landlord/ask", label: "Ask Easy" },
  { href: "/landlord/shop", label: "Shop" },
  { href: "/landlord/billing", label: "Billing" },
  { href: "/landlord/settings", label: "Settings" },
]

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) {
    return (
      <RoleGate
        title="Landlord desk"
        body="Sign in with your landlord account, accept an org invite, or create an account at Sign up. Public demo role hopping is disabled."
        action={{ href: "/login?next=/landlord", label: "Log in" }}
      />
    )
  }
  if (user.role === "pending" || !user.onboardingComplete) {
    return (
      <RoleGate
        title="Finish onboarding"
        body="Choose your role before opening the landlord desk."
        action={{ href: "/onboarding/role", label: "Continue onboarding" }}
      />
    )
  }
  if (user.roleLevel !== 2 || user.role !== "landlord_admin" || !user.tenantId) {
    return (
      <RoleGate
        title="This desk is for a Landlord Account"
        body="Your role cannot open landlord listing ops. Log in with an L2 landlord organisation or return to your desk."
        action={{ href: "/login", label: "Log in" }}
      />
    )
  }
  if (!user.tenantIsDemo && !subscriptionAllowsDesk(user.tenantStatus)) {
    return (
      <RoleGate
        title="Subscription required"
        body="Activate Basic, Growth, or Pro to unlock landlord listing ops."
        action={{ href: `${SUBSCRIBE_PATH}?from=onboard`, label: "Choose a plan" }}
      />
    )
  }
  const seatHint = user.seatRole ? ` · ${user.seatRole.replace("_", " ")}` : ""
  return (
    <PortalFrame
      kicker="Landlord"
      title={`${user.tenantName ?? "Portfolio"}${seatHint}`}
      links={links}
    >
      {children}
    </PortalFrame>
  )
}

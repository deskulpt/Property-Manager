import { redirect } from "next/navigation"
import { OnboardingRoleForm } from "@/components/auth/onboarding-role-form"
import { PageHeader } from "@/components/product"
import { SUBSCRIBE_PATH } from "@/lib/plans"
import { deskPathForLevel, subscriptionAllowsDesk } from "@/lib/role-level"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Choose your role" }

export default async function OnboardingRolePage() {
  const session = await getSessionUser()
  if (!session) redirect("/login?next=/onboarding/role")
  if (session.onboardingComplete && session.role !== "pending") {
    if (
      session.roleLevel === 2 &&
      !session.tenantIsDemo &&
      !subscriptionAllowsDesk(session.tenantStatus)
    ) {
      redirect(`${SUBSCRIBE_PATH}?from=onboard`)
    }
    redirect(deskPathForLevel(session.roleLevel))
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:px-8">
      <PageHeader
        kicker="Onboarding"
        title="How will you use Easy Rental?"
        lede="Pick the desk that matches your work. SuperAdmin and platform Admin seats are invite-only — not available on self-serve signup."
      />
      <div className="mt-8 border border-ink/10 bg-card p-5 md:p-6">
        <OnboardingRoleForm />
      </div>
    </div>
  )
}

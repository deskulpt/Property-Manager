import Link from "next/link"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { PageHeader } from "@/components/product"
import { SUBSCRIBE_PATH } from "@/lib/plans"
import { deskPathForLevel, subscriptionAllowsDesk } from "@/lib/role-level"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Log in" }

export default async function LoginPage() {
  const session = await getSessionUser()
  if (session) {
    if (!session.onboardingComplete || session.role === "pending") {
      redirect("/onboarding/role")
    }
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
        kicker="Account"
        title="Log in"
        lede="Sign in with your Easy Rental email and password. All desks require a secure session — public demo role hopping is disabled."
      />
      <div className="mt-8 border border-ink/10 bg-card p-5 md:p-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        Need an account?{" "}
        <Link href="/signup" className="font-semibold text-terra hover:underline">
          Create an account
        </Link>
        .
      </p>
    </div>
  )
}

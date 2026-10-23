import Link from "next/link"
import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"
import { SUBSCRIBE_PATH } from "@/lib/plans"
import { deskPathForLevel, subscriptionAllowsDesk } from "@/lib/role-level"
import { getSessionUser } from "@/lib/session"
import { redirect } from "next/navigation"

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
    <AuthShell
      title="Log in"
      lede="Sign in with your Easy Rental email and password. Platform L0/L1 staff land on /console; landlords continue to the desk after plan activation. Public demo role hopping is disabled."
      footer={
        <>
          <Link href="/forgot-password" className="font-semibold text-terra hover:underline">
            Forgot password
          </Link>
          <span className="mx-2 text-ink-faint">·</span>
          Need an account?{" "}
          <Link href="/signup" className="font-semibold text-terra hover:underline">
            Sign up
          </Link>
          <span className="mx-2 text-ink-faint">·</span>
          <Link href="/pricing" className="font-semibold text-terra hover:underline">
            Pricing
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}

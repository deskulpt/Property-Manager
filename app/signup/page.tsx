import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignUpForm, SignupForm } from "@/components/auth/signup-form"
import { ReferralClaimForm } from "@/components/refer/claim-form"
import { getReferrerByCode } from "@/lib/db"
import { SUBSCRIBE_PATH } from "@/lib/plans"
import { REF_COOKIE } from "@/lib/referrals"
import { deskPathForLevel, subscriptionAllowsDesk } from "@/lib/role-level"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Sign up" }

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; flow?: string }>
}) {
  const session = await getSessionUser()
  if (session) {
    if (session.role === "applicant" && !session.tenantId) {
      redirect("/create-account")
    }
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

  const sp = await searchParams
  const jar = await cookies()
  const code = (sp.ref || jar.get(REF_COOKIE)?.value || "").trim().toUpperCase()
  const referrer = code ? getReferrerByCode(code) : null
  const orgFlow = (sp.flow || "").toLowerCase() === "org"

  return (
    <AuthShell
      title="Sign up"
      lede={
        orgFlow
          ? "Create credentials, then an India landlord organisation with an owner seat (Slice A self-serve)."
          : "Create your Easy Rental credentials. Next you choose a role; landlords activate a listing plan — demo purchase, no live charge yet."
      }
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-terra hover:underline">
            Log in
          </Link>
          <span className="mx-2 text-ink-faint">·</span>
          <Link href="/pricing" className="font-semibold text-terra hover:underline">
            Pricing
          </Link>
          {!referrer ? (
            <>
              <span className="mx-2 text-ink-faint">·</span>
              <Link href="/refer" className="font-semibold text-terra hover:underline">
                Refer & Earn
              </Link>
            </>
          ) : null}
        </>
      }
    >
      {referrer ? (
        <div className="mb-6 border border-terra/25 bg-accent px-4 py-4 text-sm">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">
            Referral locked
          </p>
          <p className="mt-1">
            You arrived via <strong>{referrer.code}</strong> ({referrer.name}). Attribution is valid
            for 90 days to Published.
          </p>
        </div>
      ) : null}
      {orgFlow ? <SignUpForm /> : <SignupForm />}
      {referrer ? (
        <div className="mt-10">
          <h2 className="mb-4 font-heading text-xl font-bold">Add your C&I property</h2>
          <ReferralClaimForm code={referrer.code} />
        </div>
      ) : null}
    </AuthShell>
  )
}

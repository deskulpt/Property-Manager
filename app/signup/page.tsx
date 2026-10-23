import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SignupForm } from "@/components/auth/signup-form"
import { PageHeader } from "@/components/product"
import { ReferralClaimForm } from "@/components/refer/claim-form"
import { getReferrerByCode } from "@/lib/db"
import { SUBSCRIBE_PATH } from "@/lib/plans"
import { REF_COOKIE } from "@/lib/referrals"
import { deskPathForLevel, subscriptionAllowsDesk } from "@/lib/role-level"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Sign up" }

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
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

  const sp = await searchParams
  const jar = await cookies()
  const code = (sp.ref || jar.get(REF_COOKIE)?.value || "").trim().toUpperCase()
  const referrer = code ? getReferrerByCode(code) : null

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:px-8">
      <PageHeader
        kicker="Create account"
        title="Join Easy Rental"
        lede="Create credentials, then choose your role. Landlord organisations activate Basic, Growth, or Pro at Pricing before listing ops unlock."
      />

      {referrer ? (
        <div className="mt-6 border border-terra/25 bg-accent px-4 py-4 text-sm">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">Referral locked</p>
          <p className="mt-1">
            You arrived via <strong>{referrer.code}</strong> ({referrer.name}). Attribution is valid
            for 90 days to Published.
          </p>
        </div>
      ) : null}

      <div className="mt-8 border border-ink/10 bg-card p-5 md:p-6">
        <SignupForm />
      </div>

      {referrer ? (
        <div className="mt-10">
          <h2 className="mb-4 font-heading text-xl font-bold">Add your C&I property</h2>
          <ReferralClaimForm code={referrer.code} />
        </div>
      ) : (
        <p className="mt-6 text-sm text-ink-soft">
          Sourced by a referrer? Open their{" "}
          <Link href="/refer" className="font-semibold text-terra hover:underline">
            Refer & Earn
          </Link>{" "}
          link (for example <code className="font-mono text-terra">/r/EASY-ASHA</code>) before signing
          up.
        </p>
      )}

      <p className="mt-6 text-sm text-ink-soft">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-terra hover:underline">
          Log in
        </Link>
        . Compare plans on{" "}
        <Link href="/pricing" className="font-semibold text-terra hover:underline">
          Pricing
        </Link>
        .
      </p>
    </div>
  )
}

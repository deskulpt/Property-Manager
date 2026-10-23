import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SignupForm } from "@/components/auth/signup-form"
import { PageHeader } from "@/components/product"
import { ReferralClaimForm } from "@/components/refer/claim-form"
import { getReferrerByCode } from "@/lib/db"
import { REF_COOKIE } from "@/lib/referrals"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Sign up" }

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const session = await getSessionUser()
  if (session?.role === "landlord_admin") redirect("/landlord")

  const sp = await searchParams
  const jar = await cookies()
  const code = (sp.ref || jar.get(REF_COOKIE)?.value || "").trim().toUpperCase()
  const referrer = code ? getReferrerByCode(code) : null

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:px-8">
      <PageHeader
        kicker="Landlord account · L2"
        title="Create your organisation"
        lede="Self-serve signup for Indian landlords. Next step is choosing a listing plan (Basic / Growth / Pro) — demo purchase, no live charge yet."
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
        Already know your plan?{" "}
        <Link href="/pricing" className="font-semibold text-terra hover:underline">
          See pricing
        </Link>
        . Evaluating the OSS demo without an account? Use the{" "}
        <span className="font-semibold text-ink">Demo</span> identity switcher in the header, or{" "}
        <Link href="/login" className="font-semibold text-terra hover:underline">
          log in
        </Link>
        .
      </p>
    </div>
  )
}

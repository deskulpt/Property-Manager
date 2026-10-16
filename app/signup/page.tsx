import Link from "next/link"
import { redirect } from "next/navigation"
import { SignupForm } from "@/components/auth/signup-form"
import { PageHeader } from "@/components/product"
import { getReferrerByCode } from "@/lib/db"
import { isValidRefCode, normalizeRefCode } from "@/lib/referrals"
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
  const raw = sp.ref ?? ""
  const referrer =
    raw && isValidRefCode(raw) ? getReferrerByCode(normalizeRefCode(raw)) : null

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:px-8">
      <PageHeader
        kicker="Landlord account"
        title="Create your organisation"
        lede="Self-serve signup for Indian landlords. You land in the landlord desk with a Starter package — no payment processor in this demo."
      />
      {referrer ? (
        <p className="mt-4 border border-terra/30 bg-terra/10 px-4 py-3 text-sm text-ink">
          Referred by <span className="font-semibold">{referrer.name}</span> (
          <span className="font-mono">{referrer.code}</span>). First-touch attribution is stored for
          90 days. Proposed owner credit of ₹2,000 is FAQ-only in this MVP — not applied to billing
          automatically.
        </p>
      ) : null}
      <div className="mt-8 border border-ink/10 bg-card p-5 md:p-6">
        <SignupForm />
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        Evaluating the OSS demo without an account? Use the{" "}
        <span className="font-semibold text-ink">Demo</span> identity switcher in the header, or{" "}
        <Link href="/login" className="font-semibold text-terra hover:underline">
          log in
        </Link>
        .
      </p>
    </div>
  )
}

import Link from "next/link"
import { headers } from "next/headers"
import { PageHeader } from "@/components/product"
import { ShareReferralLink } from "@/components/refer/share-link"
import { ensureReferrerForDemo } from "@/lib/db"
import { shareLandingPath, shareSignupPath } from "@/lib/referrals"

export const metadata = { title: "Your referral link" }

export default async function ReferLinkPage() {
  const referrer = ensureReferrerForDemo()
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "127.0.0.1:3508"
  const proto = h.get("x-forwarded-proto") ?? "http"
  const origin = `${proto}://${host}`
  const path = shareLandingPath(referrer.code)
  const absolute = `${origin}${path}`

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-8">
      <PageHeader
        kicker="Refer & Earn · Path B"
        title="Share your link"
        lede={`Demo referrer ${referrer.name} · code ${referrer.code}. First-touch cookie lasts 90 days. Landlords who sign up via your link are attributed to you.`}
      />
      <ShareReferralLink absoluteUrl={absolute} shortPath={path} />
      <div className="mt-6 border border-ink/10 bg-paper-2 p-4 text-sm text-ink-soft">
        <p>
          Signup path also works:{" "}
          <code className="font-mono text-ink">{shareSignupPath(referrer.code)}</code>
        </p>
        <p className="mt-2">
          Proposed owner sweetener (FAQ only): landlords using a referral link may get a ₹2,000
          package / fee credit — not billed automatically in this MVP.
        </p>
      </div>
      <p className="mt-6 text-sm">
        <Link href="/refer/dashboard" className="font-semibold text-terra hover:underline">
          Open dashboard
        </Link>
        {" · "}
        <Link href="/refer/submit" className="font-semibold text-terra hover:underline">
          Submit a property instead
        </Link>
      </p>
    </div>
  )
}

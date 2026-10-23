import Link from "next/link"
import { PageHeader } from "@/components/product"
import { requirePlatformAdmin } from "@/lib/console-gate"

export const metadata = { title: "Referrals · Console" }

export default async function ConsoleReferralsPage() {
  await requirePlatformAdmin()
  return (
    <div>
      <PageHeader
        kicker="CMS"
        title="Referrals"
        lede="Partner refer-a-partner leads. Empty until the Refer & Earn / partner referrals slice lands on main."
      />
      <div className="border border-ink/10 bg-card p-5">
        <p className="text-sm text-ink-soft">No referral leads yet.</p>
        <p className="mt-3 text-sm">
          <Link href="/console" className="font-semibold text-terra underline">
            Back to console overview
          </Link>
        </p>
      </div>
    </div>
  )
}

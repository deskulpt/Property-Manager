import Link from "next/link"
import { PageHeader } from "@/components/product"

export const metadata = { title: "Become a partner" }

export default function PartnersStubPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:px-8">
      <PageHeader
        kicker="§19B · Partner Affiliate"
        title="Coming soon"
        lede="Realtors, architects, and contractors will enrol landlords onto Easy Rental SaaS and earn a proposed 20% of monthly subscription. This is separate from Refer & Earn (§19A)."
      />
      <p className="text-sm text-ink-soft">
        Slice J ships Refer & Earn first. Partner apply opens after live subscription billing.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/refer"
          className="bg-brand px-4 py-2.5 text-sm font-semibold text-paper hover:bg-brand-deep"
        >
          Refer & Earn instead
        </Link>
        <Link
          href="/partners/apply"
          className="border border-ink/25 px-4 py-2.5 text-sm font-semibold text-ink"
        >
          Leave interest (stub)
        </Link>
      </div>
    </div>
  )
}

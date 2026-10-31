import Link from "next/link"
import { PageHeader } from "@/components/product"

export const metadata = { title: "Partner apply" }

/** Hub — real forms live on affiliate + services apply (docs/full-funnel-ia.md). */
export default function PartnersApplyPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12 md:px-8">
      <PageHeader
        kicker="Partner network"
        title="Choose how you want to earn"
        lede="Affiliate enrolment and trade service applications are live. Commission ledger for affiliates ships with billing go-live; intake and vetting work now."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/partners/affiliate/apply"
          className="card rounded-sm border border-base-300 bg-base-100 p-5 transition-colors hover:border-secondary/50"
          data-testid="partner-apply-affiliate"
        >
          <h2 className="font-serif text-xl font-semibold text-primary">Affiliate</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Enrol landlords onto Easy Rental. Apply with type, city, PINs, and demo KYC.
          </p>
          <span className="btn btn-primary btn-sm mt-4 rounded-sm">Apply as affiliate</span>
        </Link>
        <Link
          href="/partners/services/apply"
          className="card rounded-sm border border-base-300 bg-base-100 p-5 transition-colors hover:border-secondary/50"
          data-testid="partner-apply-services"
        >
          <h2 className="font-serif text-xl font-semibold text-primary">Service provider</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Trades for parks — plumber, electrician, cleaning, courier. Catchment + landlord assign.
          </p>
          <span className="btn btn-secondary btn-sm mt-4 rounded-sm">Apply as provider</span>
        </Link>
      </div>
      <p className="mt-8 text-sm text-ink-soft">
        Sourcing C&amp;I listings instead?{" "}
        <Link href="/refer" className="link link-hover text-secondary font-semibold">
          Refer &amp; Earn
        </Link>
        .
      </p>
    </main>
  )
}

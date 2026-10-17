import Link from "next/link"
import { JsonLd } from "@/components/seo/json-ld"
import { RentEstimateCalculator } from "@/components/tools/rent-estimate-calculator"
import { buildMetadata, organizationJsonLd } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Rent estimate calculator",
  description:
    "Rough INR monthly rent range for industrial bays from SF, area PIN, and amenities. Estimate only — not an offer.",
  path: "/tools/rent-estimate",
})

type Props = { searchParams: Promise<{ sqft?: string; pin?: string }> }

export default async function RentEstimatePage({ searchParams }: Props) {
  const params = await searchParams
  const sqft = Number(params.sqft)
  const initialSqft = Number.isFinite(sqft) && sqft >= 500 ? sqft : 10000
  const initialPin = (params.pin || "421302").replace(/\D/g, "").slice(0, 6) || "421302"

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 md:px-8">
      <JsonLd data={organizationJsonLd()} />
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-terra">
        Occupant & applicant tool
      </p>
      <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
        Rent estimate
      </h1>
      <p className="mt-3 max-w-[52ch] text-lg text-ink-soft">
        Enter square footage, an India PIN, and amenities for a corridor-based INR range. This is a
        planning aid — landlords set the asking rate on each listing.
      </p>
      <p
        className="mt-4 max-w-[60ch] border border-terra/30 bg-terra/10 px-3 py-2 text-sm text-ink"
        role="note"
      >
        <strong className="font-semibold">Estimate only.</strong> Not an appraisal, lease offer, or
        brokerage quote. Confirm figures with the landlord before budgeting.
      </p>

      <div className="mt-10">
        <RentEstimateCalculator initialSqft={initialSqft} initialPin={initialPin} />
      </div>

      <p className="mt-10 text-sm text-ink-soft">
        Ready to compare live stock?{" "}
        <Link href="/listings" className="font-semibold text-terra underline-offset-4 hover:underline">
          Browse listings
        </Link>{" "}
        or open a{" "}
        <Link
          href="/properties"
          className="font-semibold text-terra underline-offset-4 hover:underline"
        >
          portfolio building
        </Link>
        .
      </p>
    </div>
  )
}

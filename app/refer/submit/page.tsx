import Link from "next/link"
import { PageHeader } from "@/components/product"
import { SubmitIndicationForm } from "@/components/refer/submit-form"

export const metadata = { title: "Submit a property" }

export default function ReferSubmitPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-8">
      <PageHeader
        kicker="Refer & Earn · Path A"
        title="Submit a property"
        lede="Tell us about a C&I asset and the landlord. We only outreach with confirmed owner consent. Status starts at New."
      />
      <p className="mb-6 text-sm text-ink-soft">
        Prefer the landlord to self-register?{" "}
        <Link href="/refer/link" className="font-semibold text-terra hover:underline">
          Get your referral link
        </Link>
        .
      </p>
      <SubmitIndicationForm />
    </div>
  )
}

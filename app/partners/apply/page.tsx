import Link from "next/link"
import { PageHeader } from "@/components/product"

export const metadata = { title: "Partner interest" }

export default function PartnerApplyStubPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:px-8">
      <PageHeader
        kicker="§19B stub"
        title="Partner interest"
        lede="Full affiliate apply (Realtor / Architect / Contractor + bank/GST) is scheduled after Refer & Earn MVP and billing. This page is a placeholder."
      />
      <div className="border border-ink/15 bg-card p-5 text-sm text-ink-soft">
        <p>Email interest to hello@easyrental.space with your trade and city (demo — not stored).</p>
        <p className="mt-3">
          Looking to tip C&I listings instead?{" "}
          <Link href="/refer" className="font-semibold text-terra hover:underline">
            Open Refer & Earn
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

import Link from "next/link"
import { PageHeader } from "@/components/product"

export const metadata = { title: "Partner apply" }

export default function PartnersApplyStubPage() {
  return (
    <main className="mx-auto max-w-[640px] px-4 py-12 md:px-8">
      <PageHeader
        kicker="§19B stub"
        title="Partner interest"
        lede="Application, unique partner codes, and 20% subscription commission tracking are scheduled after Slice J and live billing. No form is collected here yet."
      />
      <p className="text-sm text-ink-soft">
        Meanwhile, source C&I listings via{" "}
        <Link href="/refer" className="text-terra underline">
          Refer & Earn
        </Link>
        .
      </p>
    </main>
  )
}

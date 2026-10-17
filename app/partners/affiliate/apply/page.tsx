import Link from "next/link"
import { AffiliateApplyForm } from "@/components/partners/apply-forms"

export const metadata = { title: "Affiliate apply" }

export default function AffiliateApplyPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-12 md:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-terra">Affiliates</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold">Affiliate application</h1>
      <p className="mt-2 text-sm text-ink-soft">
        <Link href="/partners/affiliate" className="text-terra underline">
          ← Back to landing
        </Link>
      </p>
      <div className="mt-8">
        <AffiliateApplyForm />
      </div>
    </div>
  )
}

import Link from "next/link"
import { ServiceApplyForm } from "@/components/partners/apply-forms"

export const metadata = { title: "Service provider apply" }

export default function ServiceApplyPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-12 md:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-terra">Service providers</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold">Service provider application</h1>
      <p className="mt-2 text-sm text-ink-soft">
        <Link href="/partners/services" className="text-terra underline">
          ← Back to landing
        </Link>
      </p>
      <div className="mt-8">
        <ServiceApplyForm />
      </div>
    </div>
  )
}

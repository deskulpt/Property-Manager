import Link from "next/link"
import { PageHeader } from "@/components/product"

export const metadata = { title: "Landlord manual" }

export default function LandlordManualPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        kicker="Help"
        title="Landlord user manual"
        lede="How to list warehouse, commercial, and residential units on Easy Rental. Pricing: see pricing (Free plan = 1 unit; paid plans are per-unit in INR + 18% GST when billing ships)."
      />
      <div className="grid gap-6 text-[17px] leading-relaxed text-ink-soft">
        <section className="grid gap-2">
          <h2 className="font-sans text-xl font-extrabold text-ink">1. Create your organisation</h2>
          <p>
            Sign up at <Link href="/signup" className="font-semibold text-terra hover:underline">/signup</Link>{" "}
            with email and password. Accept the privacy notice. You land on the landlord desk.
          </p>
        </section>
        <section className="grid gap-2">
          <h2 className="font-sans text-xl font-extrabold text-ink">2. Add a property</h2>
          <p>
            Open <Link href="/landlord/properties/new" className="font-semibold text-terra hover:underline">Add property</Link>.
            Choose a segment (warehouse, commercial, or residential), fill address fields, and create the first unit.
          </p>
        </section>
        <section className="grid gap-2">
          <h2 className="font-sans text-xl font-extrabold text-ink">3. Applications</h2>
          <p>
            Applicants apply from public unit pages. Review them at{" "}
            <Link href="/landlord/applications" className="font-semibold text-terra hover:underline">Applications</Link>.
            Approving a warehouse/commercial unit posts rent + GST (18%). Approving a residential unit posts rent,
            security deposit, and maintenance — not GST (confirm with your CA).
          </p>
        </section>
        <section className="grid gap-2">
          <h2 className="font-sans text-xl font-extrabold text-ink">4. Ledger and NRI display</h2>
          <p>
            Charges stay in INR. Optionally set a display currency (USD/CAD/GBP) under Settings — a view only, not a second ledger.
          </p>
        </section>
        <section className="grid gap-2">
          <h2 className="font-sans text-xl font-extrabold text-ink">5. Demo vs live</h2>
          <p>
            If you see a Demo identity switcher, you are on a labelled demo environment. Real signup accounts never appear
            in that switcher and cannot read another organisation&apos;s properties.
          </p>
        </section>
        <p>
          Also see the <Link href="/help/faq" className="font-semibold text-terra hover:underline">FAQ</Link> and{" "}
          <Link href="/help/tenant" className="font-semibold text-terra hover:underline">tenant manual</Link>.
        </p>
      </div>
    </article>
  )
}

import Link from "next/link"
import { PageHeader } from "@/components/product"

export const metadata = { title: "Tenant manual" }

export default function TenantManualPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        kicker="Help"
        title="Tenant / applicant user manual"
        lede="Browse listings, apply, complete demo KYC, and pay the demo ledger. Live payments and licensed KYC are not enabled yet."
      />
      <div className="grid gap-6 text-[17px] leading-relaxed text-ink-soft">
        <section className="grid gap-2">
          <h2 className="font-sans text-xl font-extrabold text-ink">1. Browse</h2>
          <p>
            Open <Link href="/listings" className="font-semibold text-terra hover:underline">Listings</Link> and filter by
            segment (warehouse, commercial, residential), area, rent, and segment-specific fields (docks, BHK, fit-out).
          </p>
        </section>
        <section className="grid gap-2">
          <h2 className="font-sans text-xl font-extrabold text-ink">2. Apply</h2>
          <p>
            On a unit page, submit an application. Warehouse and commercial forms ask for company/brand; residential
            forms treat you as an individual household.
          </p>
        </section>
        <section className="grid gap-2">
          <h2 className="font-sans text-xl font-extrabold text-ink">3. KYC</h2>
          <p>
            At <Link href="/account/verify" className="font-semibold text-terra hover:underline">/account/verify</Link>,
            enter a licensed-provider reference. Easy Rental does not accept Aadhaar card images or store biometric templates.
          </p>
        </section>
        <section className="grid gap-2">
          <h2 className="font-sans text-xl font-extrabold text-ink">4. Payments</h2>
          <p>
            After approval, open Account → Payments. The demo adapter records UPI/eNACH-style ledger lines without contacting
            a bank. Live collection is not available yet — see pricing when billing launches.
          </p>
        </section>
        <section className="grid gap-2">
          <h2 className="font-sans text-xl font-extrabold text-ink">5. Your data</h2>
          <p>
            Review the{" "}
            <Link href="/legal/privacy" className="font-semibold text-terra hover:underline">Privacy Policy</Link> for
            export and erasure options under India&apos;s DPDP Act.
          </p>
        </section>
      </div>
    </article>
  )
}

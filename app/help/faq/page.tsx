import Link from "next/link"
import { PageHeader } from "@/components/product"

export const metadata = { title: "FAQ" }

const FAQS: { q: string; a: string }[] = [
  {
    q: "What property types does Easy Rental support?",
    a: "Warehouse / industrial bays, commercial shops and offices, and residential homes (apartments, villas, PG/rooms). Filter by segment on Listings.",
  },
  {
    q: "How do deposits work?",
    a: "Residential (and many commercial) units store a deposit in months of rent. On approval the ledger posts a separate deposit line. Typical residential range is 2–10 months.",
  },
  {
    q: "Is GST charged on rent?",
    a: "Warehouse and commercial approvals post 18% GST on rent in this product. Residential approvals do not post GST by default (confirm with a CA — treatment depends on use and registration).",
  },
  {
    q: "How does KYC work? Do you store Aadhaar?",
    a: "No Aadhaar images or numbers are stored. The demo uses a licensed-provider reference. Production will redirect to IDfy / Signzy / HyperVerge (or similar) and keep only status + reference ids.",
  },
  {
    q: "Can I cancel an application?",
    a: "Landlords can deny open applications. Occupants should contact the landlord to end a lease; formal cancellation / notice workflows are not fully automated yet.",
  },
  {
    q: "I am an NRI — can I see USD/CAD/GBP?",
    a: "Yes as a display preference on the landlord desk. The charge currency remains INR. Conversion uses a labelled demo FX table, not a live feed.",
  },
  {
    q: "What does pricing look like?",
    a: "See pricing when published. Planned shape: Free plan with 1 unit, then per-unit paid plans billed in INR + 18% GST. Billing provider is not live yet.",
  },
  {
    q: "Is this the live EasyRent launch?",
    a: "This build is launch-ready scaffolding. Demo data is labelled DEMO · and isolated from real signups. Live payments, SMS OTP, and licensed KYC still need production wiring.",
  },
]

export default function FaqPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        kicker="Help"
        title="FAQ"
        lede="Warehouse, commercial, residential, deposits, GST, KYC, cancellation, and NRI currency."
      />
      <div className="grid gap-6">
        {FAQS.map((item) => (
          <section key={item.q} className="grid gap-2 border-b border-ink/10 pb-5">
            <h2 className="font-sans text-lg font-extrabold text-ink">{item.q}</h2>
            <p className="text-[17px] leading-relaxed text-ink-soft">{item.a}</p>
          </section>
        ))}
      </div>
      <p className="mt-8 text-sm text-ink-soft">
        Manuals:{" "}
        <Link href="/help/landlord" className="font-semibold text-terra hover:underline">
          Landlord
        </Link>{" "}
        ·{" "}
        <Link href="/help/tenant" className="font-semibold text-terra hover:underline">
          Tenant
        </Link>
      </p>
    </article>
  )
}

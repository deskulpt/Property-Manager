import { DoNextFaq } from "@/components/cms/do-next-faq"
import { EmptyState, PageHeader } from "@/components/product"
import Link from "next/link"

export const metadata = { title: "Visits" }

export default function ApplicantVisitsPage() {
  return (
    <div>
      <PageHeader
        kicker="Scheduling"
        title="Site visits"
        lede="Request visits from a public unit page. Landlords confirm or decline from their visit desk."
      />
      <EmptyState
        title="Book from a bay page"
        body="Open an available unit and use the visit request form. Your requests appear in the landlord visit calendar."
        action={{ href: "/listings", label: "Find a bay" }}
      />
      <p className="mt-4 text-sm">
        <Link href="/listings" className="font-semibold text-terra hover:underline">Browse listings</Link>
      </p>
      <DoNextFaq
        steps={[
          { title: "Pick a bay", body: "Filter listings by area and docks." },
          { title: "Submit preferred time", body: "Phone and email are required on the unit visit form." },
          { title: "Watch Inbox", body: "Confirmations land as demo notices." },
        ]}
        faqs={[
          { q: "Can I reschedule here?", a: "Reschedule actions live on the landlord visit desk in this MVP; re-submit if needed." },
        ]}
      />
    </div>
  )
}

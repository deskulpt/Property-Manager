import Link from "next/link"
import { DoNextFaq } from "@/components/cms/do-next-faq"
import { PageHeader, StatusBadge } from "@/components/product"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Provider verify" }

export default async function ProviderVerifyPage() {
  const user = await getSessionUser()
  if (!user) return null
  return (
    <div>
      <PageHeader
        kicker={user.trade ?? "Trade"}
        title="Profile verify"
        lede="Trade, catchment, and demo KYC status. Landlords only assign jobs after they approve you for their area."
      />
      <dl className="mb-6 grid gap-3 border border-ink/10 bg-card p-4 text-sm">
        <div className="flex justify-between gap-4 border-b border-ink/10 pb-2">
          <dt className="text-ink-soft">Name</dt>
          <dd className="font-semibold">{user.name}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-ink/10 pb-2">
          <dt className="text-ink-soft">Trade</dt>
          <dd className="font-semibold">{user.trade}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-ink/10 pb-2">
          <dt className="text-ink-soft">Service area</dt>
          <dd className="font-semibold">{user.serviceArea}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Platform verify</dt>
          <dd>{user.providerVerified ? <StatusBadge status="verified" /> : <StatusBadge status="pending" />}</dd>
        </div>
      </dl>
      <p className="text-sm text-ink-soft">
        Partner intake with Aadhaar/PAN demo lives on{" "}
        <Link href="/partners/services/apply" className="font-semibold text-terra hover:underline">
          /partners/services/apply
        </Link>
        . Staff advance vetting from the console providers queue.
      </p>
      <DoNextFaq
        steps={[
          { title: "Confirm trade and catchment", body: "Jobs only match approved landlords in your service area." },
          { title: "Finish demo KYC if pending", body: "Use partner apply or wait for Service Manager verify." },
          { title: "Accept an assigned job", body: "Open Jobs when a landlord assigns work." },
        ]}
        faqs={[
          { q: "Why is my board empty?", a: "Either no landlord approved you, or no job is assigned in your area yet." },
          { q: "Live Aadhaar?", a: "No — demo stubs only." },
        ]}
      />
    </div>
  )
}

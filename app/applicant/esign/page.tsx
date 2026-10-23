import Link from "next/link"
import { DoNextFaq } from "@/components/cms/do-next-faq"
import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { agreementsForParty } from "@/lib/role-cms-store"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "E-sign" }

export default async function ApplicantEsignPage() {
  const user = await getSessionUser()
  if (!user) return null
  const docs = agreementsForParty(user.company ?? user.name)
  return (
    <div>
      <PageHeader kicker="Packets" title="E-sign" lede="Pending rental agreements from landlords. Demo e-sign and Aadhaar eSign stubs only." />
      {docs.length === 0 ? (
        <EmptyState title="No packets yet" body="When a landlord generates an agreement naming your company, it shows here." />
      ) : (
        <ul className="grid gap-3">
          {docs.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink/10 bg-card p-4">
              <div>
                <p className="font-semibold">{doc.propertyLabel} · Unit {doc.unitCode}</p>
                <p className="text-sm text-ink-soft">Status: {doc.status}</p>
              </div>
              <StatusBadge status={doc.status.includes("signed") || doc.status.includes("esign") ? "approved" : "pending"} />
              <Link href={`/agreements/${doc.id}`} className="text-sm font-semibold text-terra hover:underline">Open packet</Link>
            </li>
          ))}
        </ul>
      )}
      <DoNextFaq
        steps={[
          { title: "Open the packet", body: "Read the standard India C&I English template." },
          { title: "Choose demo e-sign or Aadhaar stub", body: "Neither calls live government services." },
          { title: "Download a copy", body: "Keep the text download for your records." },
        ]}
        faqs={[
          { q: "Is DigiLocker connected?", a: "No. Out of MVP scope." },
        ]}
      />
    </div>
  )
}

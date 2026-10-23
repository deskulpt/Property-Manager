import Link from "next/link"
import { DoNextFaq } from "@/components/cms/do-next-faq"
import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { submitDemoSign } from "@/lib/actions"
import { envelopesForOccupant } from "@/lib/db"
import { formatDay } from "@/lib/format"
import { agreementsForParty } from "@/lib/role-cms-store"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Documents" }

export default async function PortalDocumentsPage() {
  const user = await getSessionUser()
  if (!user) return null
  const docs = agreementsForParty(user.company ?? user.name)
  const envelopes = envelopesForOccupant(user.id)
  return (
    <div>
      <PageHeader
        kicker="Lease docs"
        title="Documents"
        lede="Demo rental agreements and landlord e-sign packets. Download or complete demo e-sign stubs."
      />
      {envelopes.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-3 font-serif text-lg font-semibold">E-sign packets</h2>
          <ul className="grid gap-3">
            {envelopes.map((envelope) => (
              <li key={envelope.id} className="border border-ink/10 bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{envelope.documentName}</p>
                  <StatusBadge status={envelope.status === "completed" ? "approved" : "pending"} />
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  Unit {envelope.unitCode} · {envelope.propertyName} · adapter demoESign
                </p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  Sent {formatDay(envelope.createdAt.slice(0, 10))}
                </p>
                {envelope.status === "sent" ? (
                  <form action={submitDemoSign} className="mt-4">
                    <input type="hidden" name="envelopeId" value={envelope.id} />
                    <SubmitButton pendingLabel="Signing…">Sign with demoESign</SubmitButton>
                  </form>
                ) : null}
                {envelope.status === "completed" && envelope.signedPath ? (
                  <a
                    href={envelope.signedPath}
                    className="mt-4 inline-block text-sm font-bold text-terra hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download demo stamp →
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {docs.length === 0 && envelopes.length === 0 ? (
        <EmptyState
          title="No agreements yet"
          body="When your landlord generates a lease packet, it appears here."
          action={{ href: "/profile", label: "Open profile" }}
        />
      ) : docs.length > 0 ? (
        <ul className="grid gap-3">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-ink/10 bg-card p-4"
            >
              <div>
                <p className="font-semibold">
                  {doc.propertyLabel} · Unit {doc.unitCode}
                </p>
                <p className="text-sm text-ink-soft">{doc.landlordName}</p>
              </div>
              <StatusBadge
                status={
                  doc.status === "ready"
                    ? "pending"
                    : doc.status.includes("signed") || doc.status.includes("esign")
                      ? "approved"
                      : "pending"
                }
              />
              <Link href={`/agreements/${doc.id}`} className="text-sm font-semibold text-terra hover:underline">
                Open
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <DoNextFaq
        steps={[
          { title: "Open the packet", body: "Review the English India C&I template or demo e-sign addendum." },
          { title: "Download or e-sign", body: "Use demo e-sign or Aadhaar eSign stub — not live DigiLocker." },
          { title: "Keep a copy", body: "Re-download anytime from this list." },
        ]}
        faqs={[
          { q: "Is this a live government eSign?", a: "No. Labels say Demo. No UIDAI or DigiLocker calls." },
        ]}
      />
    </div>
  )
}

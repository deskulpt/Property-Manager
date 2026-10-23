import Link from "next/link"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/product"
import {
  askEasyGateReason,
  leaseAgreementById,
  leasePartiesForUnit,
} from "@/lib/agentic"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Agreement preview" }

export default async function AgreementPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  if (askEasyGateReason(user.tenantId) === "upgrade") {
    return (
      <div>
        <PageHeader
          kicker="Ask Easy"
          title="Agreement preview"
          lede="Ask Easy requires Pro or higher."
        />
        <Link href="/landlord/settings" className="text-sm font-bold text-[var(--color-brand-2)]">
          Review package in Settings
        </Link>
      </div>
    )
  }

  const agreement = leaseAgreementById(user.tenantId, id)
  if (!agreement) notFound()
  const parties = leasePartiesForUnit(user.tenantId, agreement.unitId)

  return (
    <div className="grid gap-6">
      <PageHeader
        kicker="Ask Easy · agreement"
        title={`${agreement.country} / ${agreement.region}`}
        lede={`Status: ${agreement.status}. Demo template for eSign readiness — not legal advice.`}
      />

      <div className="flex flex-wrap gap-3">
        <Link
          href="/landlord/ask"
          className="inline-flex h-9 items-center border border-brand/20 bg-background px-3 text-sm font-bold hover:bg-muted"
        >
          ← Back to Ask Easy
        </Link>
        {agreement.esignEnvelopeId ? (
          <span className="inline-flex h-9 items-center bg-[var(--color-brand-3)]/15 px-3 font-mono text-[11px] uppercase tracking-wider text-[var(--color-brand-3)]">
            Envelope {agreement.esignEnvelopeId}
          </span>
        ) : null}
      </div>

      <aside className="border border-[var(--color-brand-3)]/40 bg-[var(--color-brand-3)]/10 p-4 text-sm">
        <p className="font-heading font-extrabold text-[var(--color-brand-3)]">Not legal advice</p>
        <p className="mt-1 text-ink-soft">
          This standard rental agreement is a demonstration document generated for Easy Rental
          onboard. Jurisdiction blurbs summarise themes only. Have qualified counsel in{" "}
          {agreement.country}/{agreement.region} review before any binding signature.
        </p>
      </aside>

      <section className="grid gap-2 border border-brand/10 bg-card p-4">
        <h2 className="font-heading text-lg font-extrabold">Parties on file</h2>
        {parties.length === 0 ? (
          <p className="text-sm text-ink-soft">No parties linked to this unit.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-3">
            {parties.map((p) => (
              <li key={p.id}>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-brand-2)]">
                  {p.role}
                </p>
                <p className="font-bold">{p.name}</p>
                <p className="text-sm text-ink-soft">{p.email}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm text-ink-soft">
          <strong>Law notes:</strong> {agreement.lawNotes}
        </p>
      </section>

      <article
        className="prose prose-sm max-w-none border border-brand/10 bg-paper p-6 shadow-[inset_0_1px_0_rgb(19_37_58_/_0.06)]"
        dangerouslySetInnerHTML={{ __html: agreement.documentHtml }}
      />
    </div>
  )
}

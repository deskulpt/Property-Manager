import Link from "next/link"
import { notFound } from "next/navigation"
import { DoNextFaq } from "@/components/cms/do-next-faq"
import { PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { demoEsignAgreementForm } from "@/lib/actions"
import { money } from "@/lib/format"
import { getAgreement } from "@/lib/role-cms-store"

export const metadata = { title: "Agreement" }

export default async function AgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agreement = getAgreement(id)
  if (!agreement) notFound()
  const downloadHref = `data:text/plain;charset=utf-8,${encodeURIComponent(agreement.bodyText)}`
  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <PageHeader
        kicker="Agreement packet"
        title={`${agreement.propertyLabel} · Unit ${agreement.unitCode}`}
        lede={`${agreement.landlordName} ↔ ${agreement.tenantPartyName} · ${money(agreement.rentInrCents)} / month`}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={agreement.status.includes("signed") || agreement.status.includes("esign") ? "approved" : "pending"} />
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">{agreement.status}</span>
        {agreement.esignRequestId ? (
          <span className="text-sm text-ink-soft">Request {agreement.esignRequestId}</span>
        ) : null}
      </div>
      <pre className="max-h-[420px] overflow-auto border border-ink/10 bg-card p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {agreement.bodyText}
      </pre>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={downloadHref}
          download={`easy-rental-agreement-${agreement.unitCode}.txt`}
          className="inline-flex h-9 items-center bg-brand px-3 text-sm font-semibold text-paper hover:bg-brand-deep"
          data-testid="agreement-download"
        >
          Download agreement
        </a>
        <form action={demoEsignAgreementForm}>
          <input type="hidden" name="agreementId" value={agreement.id} />
          <input type="hidden" name="mode" value="signed_demo" />
          <SubmitButton pendingLabel="Signing…">Demo e-sign</SubmitButton>
        </form>
        <form action={demoEsignAgreementForm}>
          <input type="hidden" name="agreementId" value={agreement.id} />
          <input type="hidden" name="mode" value="aadhaar_esign_demo" />
          <SubmitButton variant="outline" pendingLabel="Requesting…">Aadhaar eSign stub</SubmitButton>
        </form>
        <Link href="/agreements/new" className="inline-flex h-9 items-center text-sm font-semibold text-terra hover:underline">
          New agreement
        </Link>
      </div>
      <DoNextFaq
        steps={[
          { title: "Download the text", body: "Keep a local copy of the generated English template." },
          { title: "Complete demo e-sign", body: "Either stub marks the packet signed_demo / aadhaar_esign_demo." },
          { title: "Share with the other party", body: "Occupants find packets under Portal → Documents." },
        ]}
        faqs={[
          { q: "PDF engine?", a: "MVP ships a plain-text download that prints cleanly. Swap for a PDF renderer later." },
        ]}
      />
    </div>
  )
}

import { PageHeader } from "@/components/product"

export const metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        kicker="Legal"
        title="Privacy Policy"
        lede="How Easy Rental (DeSkulpt Inc.) handles personal data for India and Canada demos and intended hosted use."
      />
      <div
        className="mb-8 border border-terra/40 bg-terra/10 px-4 py-3 text-sm leading-relaxed text-ink"
        role="note"
      >
        <strong className="font-semibold">Template for product demo.</strong> This policy describes
        the demo build and intended production posture. It is not legal advice. Counsel should review
        for Digital Personal Data Protection Act, 2023 (India) and PIPEDA (Canada) before production.
      </div>
      <div className="grid gap-5 text-[17px] leading-relaxed text-ink-soft">
        <p>
          Easy Rental is a product of <strong className="text-ink">DeSkulpt Inc.</strong> We do not
          sell personal information. The demo does not run advertising pixels or a data-broker export.
          If you self-host or operate a real portfolio, you become the organisation responsible for
          what you collect and must replace this policy to match that operation.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">1. Roles</h2>
        <p>
          For the hosted demo, DeSkulpt Inc. is the service operator. Landlord organisations that
          invite applicants or providers may be controllers (or similar) of contact and application
          data they enter. Applicants and partners decide what they submit into forms.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">2. What the demo stores</h2>
        <p>
          A local SQLite file holds seeded names, example emails on the .example domain, applications
          you submit, floor-plan images you upload, hotspot positions, ledger rows, job status, and
          verification metadata: country, region, document type, original filename, and a simulated
          score. Cookies may include <code className="font-mono text-sm">deskulpt_user</code> (demo
          session) and <code className="font-mono text-sm">market</code> (IN or CA preference). The
          same preference may be mirrored in localStorage.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">3. What it does not store</h2>
        <p>
          Document uploads and face images are read for a filename and a local preview, then
          discarded. The server does not write those bytes to disk and does not keep a biometric
          template. Full card numbers are never requested. Aadhaar / driver’s licence images and SIN
          stubs in the Canada path are demo UX only — do not submit real government identifiers into
          a demo environment.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">4. India — DPDP (high level)</h2>
        <p>
          Under India’s Digital Personal Data Protection Act, 2023, production use should identify a
          Data Fiduciary, honour purpose limitation and consent (or other lawful grounds), support
          data principal rights (access, correction, erasure where applicable), and secure personal
          data. Cross-border transfers and children’s data need specific treatment. Easy Rental’s
          demo is not a certified DPDP compliance programme; operators must complete their own
          assessments before going live.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">5. Canada — PIPEDA (high level)</h2>
        <p>
          Under PIPEDA, organisations must obtain meaningful consent for collection, use, and
          disclosure of personal information for commercial activity, limit collection to what is
          required, safeguard data, and provide access and correction. Provincial private-sector laws
          (for example in Alberta, British Columbia, and Quebec) may also apply. SIN should not be
          requested unless required for a lawful purpose; the demo’s SIN last-3 field is a stub, not
          a production requirement.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">6. Verification</h2>
        <p>
          India selects Aadhaar as the document type; Canada selects a provincial driver’s licence
          (optional SIN stub). Neither path calls UIDAI, a motor-vehicle agency, CRA, or any other
          government API. A “match” is a simulated number — not identity proof.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">7. Payments, email, and push</h2>
        <p>
          India production is expected to use INR processors such as Razorpay under their DPA. Canada
          CAD processors are not live yet. Demo adapters return a reference and write a ledger line
          only. Email and web push in the demo write inbox rows; they do not send mail or subscribe a
          browser to a push service unless explicitly configured later.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">8. Retention and security</h2>
        <p>
          Demo data lives on the machine running the server. Production retention schedules, encryption,
          and incident response must be defined before hosting real applicants. Floor plans and unit
          media you upload stay on that host; Matterport URLs load in the visitor’s browser from
          Matterport.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">9. Contact</h2>
        <p>
          Privacy questions for the hosted product: use the support channels on easyrental.space /
          DeSkulpt Inc. contact details shown in the product header.
        </p>

        <p className="text-sm text-ink-faint">
          Last updated for dual-market demo template · DeSkulpt Inc. / Easy Rental · India + Canada
        </p>
      </div>
    </article>
  )
}

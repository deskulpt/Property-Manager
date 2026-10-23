import Link from "next/link"
import { PageHeader } from "@/components/product"

export const metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        kicker="Legal"
        title="Privacy Policy"
        lede="What Easy Rental stores, what it refuses to store, and your rights under India’s Digital Personal Data Protection Act, 2023 (DPDP)."
      />
      <div className="grid gap-5 text-[17px] leading-relaxed text-ink-soft">
        <p>
          Easy Rental is a product of DeSkulpt Inc. Easy Rental does not sell personal information. The
          open-source demo does not run advertising pixels or a data broker. If you operate the software for
          a real portfolio, you become the data fiduciary for what you collect and should replace this policy
          with one that matches that operation.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">Consent</h2>
        <p>
          Landlord signup requires an explicit checkbox accepting this Privacy Policy and the Terms. That
          grant is stored as a <code className="font-mono text-sm">consent_events</code> row (purpose{" "}
          <code className="font-mono text-sm">signup_privacy_terms</code>, version{" "}
          <code className="font-mono text-sm">dpdp-2023-v1</code>). Demo KYC also requires an on-screen consent
          before a simulated check runs. Exports and erasure requests are logged the same way.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">What we store</h2>
        <p>
          A SQLite database holds account name and email, organisation name, applications, floor-plan images
          you upload, hotspot positions, ledger rows, job status, phone numbers after OTP verify, and
          verification metadata: country, region, document type (licensed KYC provider reference — not an
          Aadhaar image), and a simulated score. A signed HTTP-only cookie remembers your session.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">What we do not store</h2>
        <p>
          Easy Rental does not collect or store Aadhaar card images, Aadhaar numbers, or biometric templates.
          Document and face files typed in the demo wizard are used for a local filename preview only and are
          not written to disk. Full payment card numbers are never requested. Shop Razorpay secrets (if you
          enter them) are encrypted at rest with the server secret key.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">Access, correction, export, erasure</h2>
        <p>
          Signed-in users can download a JSON export of their rows from Account (applicants) or Settings
          (landlords) via <strong>Download my data</strong>. Applicants can request self-service erasure,
          which redacts name, email, phone, company, and verification rows while keeping ledger history for
          the landlord’s accounting. Organisation-level deletion for landlord admins is handled by the
          operator so rent history is not destroyed silently. Contact the platform operator for correction
          of account fields you cannot edit in-product.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">Verification</h2>
        <p>
          The wizard is labeled as a demo. India uses a simulated licensed-provider reference (IDfy / Signzy /
          HyperVerge style). It does not call UIDAI. A production launch will redirect to a contracted KYC
          processor and keep only status plus provider reference ids.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">Payments, email, and push</h2>
        <p>
          The demo payment adapter returns a reference and writes a ledger line. It does not contact a
          processor. Email and web push are interfaces only; the demo sender writes inbox rows marked{" "}
          <code className="font-mono text-sm">email_demo</code> /{" "}
          <code className="font-mono text-sm">push_demo</code>.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">Demo vs real accounts</h2>
        <p>
          Seeded demo identities belong to the labelled organisation <strong>DEMO · EasyRent Hyderabad</strong>{" "}
          (<code className="font-mono text-sm">is_demo=1</code>). Real signups use{" "}
          <code className="font-mono text-sm">is_demo=0</code> and never appear in the demo identity switcher.
          The switcher is off in production unless explicitly enabled for a labelled demo host.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">Cookies and the service worker</h2>
        <p>
          The session cookie is HTTP-only, SameSite=Lax, and Secure in production. The service worker caches
          icons and media for installability. It does not cache your ledger or applications.
        </p>

        <p className="text-sm">
          Related:{" "}
          <Link href="/legal/terms" className="font-semibold text-terra hover:underline">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/help/faq" className="font-semibold text-terra hover:underline">
            FAQ
          </Link>
        </p>
      </div>
    </article>
  )
}

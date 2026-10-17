import { PageHeader } from "@/components/product"

export const metadata = { title: "Terms of Service" }

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        kicker="Legal"
        title="Terms of Service"
        lede="Operating terms for Easy Rental, a product of DeSkulpt Inc., offered for India and Canada."
      />
      <div
        className="mb-8 border border-terra/40 bg-terra/10 px-4 py-3 text-sm leading-relaxed text-ink"
        role="note"
      >
        <strong className="font-semibold">Template for product demo.</strong> This copy describes how
        Easy Rental is intended to operate. It is not legal advice. Have counsel review and localise
        before any production or hosted commercial use in India or Canada.
      </div>
      <div className="grid gap-5 text-[17px] leading-relaxed text-ink-soft">
        <p>
          Easy Rental (easyrental.space) is a product of <strong className="text-ink">DeSkulpt Inc.</strong>{" "}
          DeSkulpt Inc. operates the hosted service. If you self-host the open-source build, you are
          the operator for that deployment and these hosted-service clauses apply only by analogy.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">1. Marketplace, not brokerage</h2>
        <p>
          Easy Rental is <strong className="text-ink">software for industrial and commercial leasing
          workflows</strong> — listings, applications, verification demos, ledgers, referrals, partner
          intake, and related tools. It is a <strong className="text-ink">No Broker</strong>{" "}
          marketplace style product: landlords list and manage stock; applicants apply direct. Easy
          Rental / DeSkulpt Inc. is <strong className="text-ink">not a real-estate broker, realtor,
          agent, or escrow agent</strong> in India or Canada. We do not negotiate leases on your
          behalf, hold client money as a brokerage, or guarantee occupancy, creditworthiness, or
          title.
        </p>
        <p>
          Commercial leasing rules differ by Indian state/UT and by Canadian province or territory.
          You remain responsible for offer-to-lease, deposits, HST/GST, stamp duty, and any licensed
          professional you engage.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">2. Markets — India and Canada</h2>
        <p>
          The product template supports <strong className="text-ink">India (default)</strong> and{" "}
          <strong className="text-ink">Canada</strong> via a market switch (cookie / localStorage{" "}
          <code className="font-mono text-sm">market=IN|CA</code>). Currency display, postal fields,
          ID document types, and sample rent corridors follow the selected market. Seeded portfolio
          data may remain India-centric in early demos; Canada mode duplicates the same information
          architecture with Canada-oriented labels and estimates.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">3. Accounts, organisations, roles</h2>
        <p>
          A “tenant” in this software means a <strong className="text-ink">landlord organisation</strong>,
          not a person who rents a bay. Properties, units, applications, jobs, and ledger lines are
          scoped to that organisation. Applicants, service providers, referrers, and platform staff
          are separate roles. Operators who add real accounts must implement access control beyond
          any demo identity switcher.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">4. Subscriptions and pricing</h2>
        <p>
          Landlord plans (for example Basic / Growth / Pro) are billed{" "}
          <strong className="text-ink">per active listed property per year</strong> in the currency of
          the active market when live billing is enabled. Occupant application to listed stock is
          intended to remain free of seeker contact packs (“No Broker”). Prices shown in demos are
          illustrative until a live checkout is enabled. Refunds, taxes (GST India / GST-HST Canada),
          and invoice terms will follow the billing provider’s agreement and DeSkulpt Inc.’s order
          form when issued.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">5. Referrals and partner services</h2>
        <p>
          Refer & Earn and Partner / Service Network features are software workflows for sourcing
          leads and service providers. Demo ledgers may show illustrative rewards in INR or CAD;
          they are <strong className="text-ink">not bank payouts</strong> until a payout programme is
          expressly enabled. Partner assignment is operational matching, not a licence to practice a
          trade. Landlords approve providers before assignment where the product requires it.
          Affiliate-style commissions (if enabled later) will be described in a separate schedule.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">6. Identity, e-sign, and documents</h2>
        <p>
          <strong className="text-ink">India:</strong> the verification wizard may collect an Aadhaar
          document type for demo purposes. It does not contact UIDAI. E-sign flows in the demo
          simulate consent; production e-sign must use a lawful authentication method under
          applicable Indian IT and evidence rules.
        </p>
        <p>
          <strong className="text-ink">Canada:</strong> verification uses a provincial driver’s
          licence path and an optional SIN last-digits stub for demo UX only. Do not upload a real
          SIN or government ID to a demo environment. Production identity checks must follow PIPEDA
          and provincial rules; SIN must not be collected unless legally required and protected.
        </p>
        <p>
          Automated rental agreement PDFs and demo e-sign are templates. They are not counsel-approved
          forms for any province or Indian jurisdiction.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">7. Payments</h2>
        <p>
          <strong className="text-ink">India:</strong> hosted production is expected to use INR rails
          such as Razorpay (UPI / cards / mandates as configured). Demo adapters write ledger rows
          only — they do not debit a bank or UPI handle.
        </p>
        <p>
          <strong className="text-ink">Canada:</strong> CAD display and estimates are active in market
          switch mode; a live CAD processor (for example Interac or card) is{" "}
          <strong className="text-ink">not yet wired</strong>. Until then, payment screens remain demo
          stubs. NRI or cross-border display currencies (USD / CAD / GBP) for India portfolios are
          display-only FX tables, not settlement currencies, unless separately agreed.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">8. Acceptable use</h2>
        <p>
          Do not use Easy Rental to impersonate a government identity check, to collect identity
          documents you are not prepared to protect, or to present a simulated payment as a completed
          charge. Do not scrape, attack, or overload the service. Do not list property you are not
          authorised to offer.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">9. Intellectual property and licence</h2>
        <p>
          The application source is MIT licensed unless a file states otherwise. Third-party packages
          keep their own licences (GSAP under its standard commercial terms; Matterport remains
          Matterport’s service when you embed a show URL). Easy Rental branding, marketing copy, and
          hosted datasets remain DeSkulpt Inc. property.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">10. Disclaimers and liability</h2>
        <p>
          The software and demo are provided <strong className="text-ink">as is</strong>. Occupancy
          figures, late fees, verification scores, rent estimates, and corridor rates are workflow
          illustrations — not appraisals, credit decisions, or legal advice. To the fullest extent
          permitted by law, DeSkulpt Inc. is not liable for indirect, incidental, special, or
          consequential damages, or for lost profits, lost rent, or data loss arising from use of the
          demo or software. Where liability cannot be excluded, it is limited to fees you paid
          DeSkulpt Inc. for the service in the three months before the claim (or zero for free demos).
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">11. Privacy</h2>
        <p>
          Personal data handling is described in the{" "}
          <a href="/legal/privacy" className="font-semibold text-brand underline-offset-2 hover:underline">
            Privacy Policy
          </a>
          , including high-level India DPDP and Canada PIPEDA notes.
        </p>

        <h2 className="font-sans text-2xl font-extrabold text-ink">12. Changes and contact</h2>
        <p>
          We may update these terms for the hosted service; material changes will be posted on this
          page. Questions: use the contact details on easyrental.space or the support channels shown
          in the product header.
        </p>

        <p className="text-sm text-ink-faint">
          Last updated for dual-market demo template · DeSkulpt Inc. / Easy Rental · India + Canada
        </p>
      </div>
    </article>
  )
}

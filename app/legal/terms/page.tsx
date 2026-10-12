import { PageHeader } from "@/components/product"

export const metadata = { title: "Terms of Service" }

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader kicker="Legal" title="Terms of Service" lede="These terms cover the DeSkulpt software and the demo you are using. They are written for this product, not copied from a generic template." />
      <div className="grid gap-5 text-[17px] leading-relaxed text-ink-soft">
        <p>DeSkulpt is open-source property-management software for landlords, applicants, and service providers. If you run it yourself, you are the operator. The seeded walkthrough in this repository is a demonstration, not a live tenancy, a credit decision, or a payment account.</p>
        <h2 className="font-sans text-2xl font-extrabold text-ink">The demo</h2>
        <p>Identities in the header are fixtures. Switching them does not authenticate you. Do not upload a real passport, a real Aadhaar number, a real driver’s licence image, or a real payment card. The verification wizard simulates a match. It does not contact UIDAI or any other government registry, and it does not store a biometric template. The payment screen records ledger rows through a demo adapter. It does not charge a card or debit a bank account.</p>
        <h2 className="font-sans text-2xl font-extrabold text-ink">Accounts and organisations</h2>
        <p>A tenant in this software is a landlord organisation, not a person who rents a bay. Data for properties, units, applications, jobs, and ledger lines is scoped to that organisation. Applicants and service providers are separate roles. An operator who later adds real accounts is responsible for access control beyond this demo switcher.</p>
        <h2 className="font-sans text-2xl font-extrabold text-ink">Acceptable use</h2>
        <p>Do not use DeSkulpt to impersonate a government identity check, to collect identity documents you are not prepared to protect, or to present a simulated payment as a completed charge. Service-provider assignment is an operational workflow, not a licence to practice a trade.</p>
        <h2 className="font-sans text-2xl font-extrabold text-ink">Software licence</h2>
        <p>The application source is MIT licensed. Third-party packages keep their own OSI licences, except GSAP, which is used under its no-fee standard licence for commercial and non-commercial use. Matterport, if you paste a show URL, remains Matterport’s service. DeSkulpt only embeds an iframe.</p>
        <h2 className="font-sans text-2xl font-extrabold text-ink">No warranty</h2>
        <p>The software is provided as is. Occupancy figures, late fees, and verification scores in the demo are illustrations of the workflow. They are not advice on a real lease.</p>
      </div>
    </article>
  )
}

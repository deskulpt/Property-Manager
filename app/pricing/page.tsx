import Link from "next/link"
import { JsonLd } from "@/components/seo/json-ld"
import { buildMetadata, organizationJsonLd } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Pricing",
  description:
    "Easy Rental landlord plans — Starter and Pro for India C&I listings. Custom domain on Pro. No Broker: applicants apply direct.",
  path: "/pricing",
})

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-14 md:px-8">
      <JsonLd data={organizationJsonLd()} />
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-terra">Landlords</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold">Pricing</h1>
      <p className="mt-3 max-w-[50ch] text-ink-soft">
        Starter and Pro packages for landlord organisations. Billing and affiliate commissions ship
        next. Demo subscribe records intent only.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="flex flex-col border border-ink/15 bg-paper-2 p-6">
          <h2 className="font-serif text-2xl font-semibold">Starter</h2>
          <p className="mt-2 font-mono text-sm text-terra">INR / year · proposed</p>
          <ul className="mt-4 grid flex-1 gap-2 text-sm text-ink-soft">
            <li>Listings + applications</li>
            <li>Concierge jobs</li>
            <li>Visit booking</li>
          </ul>
          <Link
            href="/pricing/subscribe?plan=starter"
            className="mt-6 inline-block bg-brand px-4 py-2.5 text-center text-sm font-semibold text-paper hover:bg-brand-deep"
          >
            Subscribe (demo)
          </Link>
        </article>
        <article className="flex flex-col border border-ink/15 bg-card p-6 ring-1 ring-terra/30">
          <h2 className="font-serif text-2xl font-semibold">Pro</h2>
          <p className="mt-2 font-mono text-sm text-terra">INR / year · proposed</p>
          <ul className="mt-4 grid flex-1 gap-2 text-sm text-ink-soft">
            <li>Everything in Starter</li>
            <li>Custom domain (CNAME)</li>
            <li>Shop + Ask Easy</li>
          </ul>
          <Link
            href="/pricing/subscribe?plan=pro"
            className="mt-6 inline-block bg-terra px-4 py-2.5 text-center text-sm font-semibold text-paper hover:bg-terra-dark"
          >
            Subscribe (demo)
          </Link>
        </article>
      </div>
      <p className="mt-8 text-sm text-ink-soft">
        After subscribe:{" "}
        <strong className="font-semibold text-ink">Host on your domain</strong> CTA, direct
        portfolio link, and{" "}
        <Link href="/landlord/settings" className="text-terra underline-offset-4 hover:underline">
          landlord domain settings
        </Link>{" "}
        for CNAME.
      </p>
      <Link
        href="/signup"
        className="mt-6 inline-block text-sm font-semibold text-brand underline-offset-4 hover:underline"
      >
        Or create a landlord account →
      </Link>
    </div>
  )
}

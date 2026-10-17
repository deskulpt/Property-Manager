import Link from "next/link"

export const metadata = { title: "Pricing" }

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-14 md:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-terra">Landlords</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold">Pricing (demo)</h1>
      <p className="mt-3 max-w-[50ch] text-ink-soft">
        Thin demo packaging — Starter vs Pro. Live billing and affiliate 20% commissions (§19B) are
        scheduled later.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="border border-ink/15 bg-paper-2 p-6">
          <h2 className="font-serif text-2xl font-semibold">Starter</h2>
          <p className="mt-2 font-mono text-sm text-terra">Demo · INR</p>
          <ul className="mt-4 grid gap-2 text-sm text-ink-soft">
            <li>Listings + applications</li>
            <li>Concierge jobs</li>
            <li>Visit booking</li>
          </ul>
        </article>
        <article className="border border-ink/15 bg-card p-6 ring-1 ring-terra/30">
          <h2 className="font-serif text-2xl font-semibold">Pro</h2>
          <p className="mt-2 font-mono text-sm text-terra">Demo · INR</p>
          <ul className="mt-4 grid gap-2 text-sm text-ink-soft">
            <li>Everything in Starter</li>
            <li>Custom domain</li>
            <li>Shop + Ask Easy</li>
          </ul>
        </article>
      </div>
      <Link
        href="/signup"
        className="mt-8 inline-block bg-brand px-5 py-3 text-sm font-semibold text-paper hover:bg-brand-deep"
      >
        Create landlord account
      </Link>
    </div>
  )
}

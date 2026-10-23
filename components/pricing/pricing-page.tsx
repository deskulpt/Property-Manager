import Link from "next/link"
import { Motion } from "@/components/marketing/motion"
import {
  BRAND_CONTACT,
  mailtoHref,
  telHref,
  whatsappHref,
} from "@/lib/brand-contact"
import {
  COMPARE_ROWS,
  FAB_ROWS,
  FEATURE_MATRIX,
  PUBLIC_PLANS,
  subscribeHref,
} from "@/lib/plans"

export function PricingPage() {
  return (
    <Motion>
      {/* Hero — brand first, No Broker! above the fold */}
      <section className="relative isolate overflow-hidden border-b border-ink/10">
        <div
          className="blueprint-grid pointer-events-none absolute inset-0 -z-10 opacity-70"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_0%,rgb(14_110_140/0.16),transparent_55%),radial-gradient(ellipse_at_90%_30%,rgb(143_111_31/0.08),transparent_45%)]"
          aria-hidden
        />
        <div className="mx-auto grid min-h-[min(70vh,560px)] max-w-[1200px] items-end gap-10 px-4 pb-14 pt-16 md:grid-cols-[1.15fr_0.85fr] md:px-8 md:pb-20 md:pt-22">
          <div>
            <p className="hero-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Easy Rental"
                width={480}
                height={270}
                className="h-14 w-auto object-contain md:h-16"
              />
            </p>
            <p className="hero-rise mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-terra">
              Landlord listing plans · proposed
            </p>
            <h1 className="hero-rise mt-3 max-w-[18ch] font-serif text-3xl font-medium leading-snug tracking-tight text-ink md:text-4xl">
              List once. Lease direct.{" "}
              <span className="text-terra">No Broker!</span>
            </h1>
            <p className="hero-rise mt-4 max-w-[42ch] text-base leading-relaxed text-ink-soft md:text-lg">
              Pay per active listed property for 12 months — not brokerage, not seeker contact
              packs. Occupants browse, visit, and apply free.
            </p>
            <div className="hero-rise mt-8 flex flex-wrap gap-3">
              <Link
                href="#plans"
                className="bg-brand px-5 py-3 text-sm font-semibold tracking-wide text-paper transition-colors hover:bg-brand-deep"
              >
                See landlord plans
              </Link>
              <Link
                href="/listings"
                className="border border-ink/25 bg-paper/80 px-5 py-3 text-sm font-semibold tracking-wide text-ink transition-colors hover:border-terra hover:text-terra"
              >
                Browse & apply free
              </Link>
            </div>
          </div>
          <div className="hero-rise relative hidden overflow-hidden border border-ink/15 md:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/media/gen-exterior.jpg"
              alt="Industrial warehouse bays ready to list"
              className="aspect-[4/3] h-full w-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 bg-brand/85 px-4 py-3 text-sm text-paper">
              Per property · annual · No Broker!
            </span>
          </div>
        </div>
      </section>

      {/* Occupant strip — brief acceptance: free apply above fold on mobile via sticky-ish band */}
      <section
        className="border-b border-ink/10 bg-terra/10"
        aria-label="For occupants"
        data-testid="pricing-occupant-strip"
      >
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
          <p className="text-sm font-semibold text-ink md:text-base">
            Occupants: browse & apply free — <span className="text-terra">No Broker!</span>
          </p>
          <Link
            href="/listings"
            className="text-sm font-semibold text-terra underline-offset-4 hover:underline"
          >
            Open listings
          </Link>
        </div>
      </section>

      {/* Plan cards */}
      <section id="plans" className="mx-auto max-w-[1200px] px-4 py-16 md:px-8" data-testid="pricing-plans">
        <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">
          Plans for landlords
        </p>
        <h2 className="reveal mt-3 max-w-[22ch] font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Basic · Growth · Pro — annual per active listing
        </h2>
        <p className="reveal mt-3 max-w-[58ch] text-ink-soft">
          Meter = active listed (published) properties. Drafts do not consume a seat until
          published. Amounts are <strong className="font-semibold text-ink">proposed</strong>{" "}
          until commercial sign-off; GST shown separately at checkout when billing goes live.
        </p>

        <div className="reveal mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PUBLIC_PLANS.map((plan) => (
            <article
              key={plan.id}
              data-testid={`plan-card-${plan.id}`}
              className={[
                "flex flex-col border bg-card p-5",
                plan.featured
                  ? "border-terra ring-2 ring-terra/30"
                  : "border-ink/15",
              ].join(" ")}
            >
              {plan.featured ? (
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-terra">
                  Most popular
                </p>
              ) : (
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  {plan.proposed ? "Proposed" : "Plan"}
                </p>
              )}
              <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">{plan.label}</h3>
              <p className="mt-3 font-serif text-3xl font-semibold tracking-tight text-brand">
                {plan.priceLabel}
              </p>
              {plan.priceInr != null ? (
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  / active listed property / year · excl. GST
                </p>
              ) : (
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  Volume + SSO / white-label
                </p>
              )}
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">{plan.blurb}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-ink">
                {plan.highlights.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-terra" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {plan.id === "enterprise" ? (
                <a
                  href={plan.href}
                  className="mt-6 block bg-brand px-4 py-3 text-center text-sm font-semibold text-paper transition-colors hover:bg-brand-deep"
                >
                  {plan.cta}
                </a>
              ) : (
                <Link
                  href={subscribeHref(plan.id, { from: "pricing" })}
                  className={[
                    "mt-6 block px-4 py-3 text-center text-sm font-semibold transition-colors",
                    plan.featured
                      ? "bg-terra text-paper hover:bg-terra-dark"
                      : "bg-brand text-paper hover:bg-brand-deep",
                  ].join(" ")}
                >
                  {plan.cta}
                </Link>
              )}
            </article>
          ))}
        </div>
        <p className="reveal mt-6 text-xs text-ink-faint" data-testid="pricing-gst-note">
          Prices excl. GST unless commercial owner decides inclusive display. Illustrative until
          Razorpay Subscriptions billing is live — this page activates the package flag on your
          org (demo purchase).
        </p>
      </section>

      {/* FAB */}
      <section className="border-y border-ink/10 bg-paper-2/60">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-8">
          <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">
            Features → advantages → benefits
          </p>
          <h2 className="reveal mt-3 font-serif text-2xl font-semibold md:text-3xl">
            Why landlords pick Easy Rental
          </h2>
          <div className="reveal mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ink/20 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  <th className="py-3 pr-4 font-medium">Feature</th>
                  <th className="py-3 pr-4 font-medium">Advantage</th>
                  <th className="py-3 font-medium">Benefit</th>
                </tr>
              </thead>
              <tbody>
                {FAB_ROWS.map((row) => (
                  <tr key={row.feature} className="border-b border-ink/10 align-top">
                    <td className="py-3 pr-4 font-semibold text-ink">{row.feature}</td>
                    <td className="py-3 pr-4 text-ink-soft">{row.advantage}</td>
                    <td className="py-3 text-ink-soft">{row.benefit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Feature matrix */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-8" data-testid="pricing-matrix">
        <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">
          Feature matrix
        </p>
        <h2 className="reveal mt-3 font-serif text-2xl font-semibold md:text-3xl">
          Basic vs Growth vs Pro
        </h2>
        <div className="reveal mt-8 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink/20 bg-paper-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                <th className="px-3 py-3 font-medium">Feature</th>
                <th className="px-3 py-3 font-medium">Basic</th>
                <th className="px-3 py-3 font-medium">Growth</th>
                <th className="px-3 py-3 font-medium">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_MATRIX.map((row) => (
                <tr key={row.feature} className="border-b border-ink/10 align-top">
                  <td className="px-3 py-3 font-semibold text-ink">{row.feature}</td>
                  <td className="px-3 py-3 text-ink-soft">{row.starter}</td>
                  <td className="px-3 py-3 text-ink-soft">{row.growth}</td>
                  <td className="px-3 py-3 text-ink-soft">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-y border-ink/10 bg-brand text-paper" data-testid="pricing-compare">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-8">
          <p className="reveal font-mono text-xs uppercase tracking-[0.18em] text-terra">
            How we compare
          </p>
          <h2 className="reveal mt-3 font-serif text-2xl font-semibold md:text-3xl">
            Brokerage vs contact packs vs Easy Rental
          </h2>
          <p className="reveal mt-3 max-w-[56ch] text-sm text-paper/75">
            NoBroker-style amounts are research snapshots (approximate / residential-adjacent). Easy
            Rental amounts are proposed — we do not invent live commercial SKUs.
          </p>
          <div className="reveal mt-8 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/20 font-mono text-[11px] uppercase tracking-wider text-paper/55">
                  <th className="py-3 pr-4 font-medium"> </th>
                  <th className="py-3 pr-4 font-medium">Traditional brokerage</th>
                  <th className="py-3 pr-4 font-medium">Contact-pack style</th>
                  <th className="py-3 font-medium text-terra">Easy Rental</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.dimension} className="border-b border-white/10 align-top">
                    <td className="py-3 pr-4 font-semibold">{row.dimension}</td>
                    <td className="py-3 pr-4 text-paper/70">{row.brokerage}</td>
                    <td className="py-3 pr-4 text-paper/70">{row.contactPacks}</td>
                    <td className="py-3 font-medium text-paper">{row.easyRental}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Occupant block */}
      <section className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 md:grid-cols-2 md:px-8">
        <div className="reveal">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-terra">For occupants</p>
          <h2 className="mt-3 font-serif text-2xl font-semibold md:text-3xl">
            Browse free. Visit free. Apply free.
          </h2>
          <p className="mt-4 text-ink-soft">
            Easy Rental does not sell owner-contact unlock packs. You verify and apply with the
            landlord directly — that is the No Broker! promise.
          </p>
          <Link
            href="/listings"
            className="mt-6 inline-block bg-brand px-5 py-3 text-sm font-semibold text-paper hover:bg-brand-deep"
          >
            Browse listings
          </Link>
        </div>
        <div className="reveal overflow-hidden border border-ink/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/gen-clearspan.jpg"
            alt="Warehouse interior for touring applicants"
            className="aspect-[16/10] w-full object-cover"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ink/10 bg-paper-2">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-14 md:flex-row md:items-end md:justify-between md:px-8">
          <div>
            <h2 className="font-serif text-2xl font-semibold md:text-3xl">Ready to list?</h2>
            <p className="mt-2 max-w-[40ch] text-ink-soft">
              Sign up as a landlord, pick Basic / Growth / Pro, then open the desk. Secure onboard
              may add a role step before this purchase page.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="bg-brand px-5 py-3 text-sm font-semibold text-paper hover:bg-brand-deep"
            >
              Sign up
            </Link>
            <a
              href={whatsappHref(
                BRAND_CONTACT.whatsappE164,
                "Hello Easy Rental — I have a question about landlord plans.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-ink/25 bg-paper px-5 py-3 text-sm font-semibold text-ink hover:border-terra hover:text-terra"
            >
              WhatsApp
            </a>
            <a
              href={telHref(BRAND_CONTACT.salesPhoneE164)}
              className="border border-ink/25 bg-paper px-5 py-3 text-sm font-semibold text-ink hover:border-terra hover:text-terra"
            >
              {BRAND_CONTACT.salesPhoneDisplay}
            </a>
            <a
              href={mailtoHref(BRAND_CONTACT.email)}
              className="px-2 py-3 text-sm font-semibold text-terra hover:underline"
            >
              {BRAND_CONTACT.email}
            </a>
          </div>
        </div>
      </section>
    </Motion>
  )
}

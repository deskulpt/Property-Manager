import Link from "next/link"
import {
  ADVANTAGES,
  COMPARISON,
  COMPARISON_ROWS,
  FEATURE_MATRIX,
  PRICING_META,
  PRICING_PLANS,
  formatMatrixCell,
} from "@/lib/pricing"
import {
  BRAND_CONTACT,
  telHref,
  whatsappHref,
} from "@/lib/brand-contact"

export const metadata = {
  title: "Pricing",
  description:
    "Easy Rental landlord plans — annual fee per active listed property. No Broker: applicants verify and apply directly.",
}

const WA_PRICING = whatsappHref(
  BRAND_CONTACT.whatsappE164,
  "Hello Easy Rental — I want to discuss landlord pricing plans.",
)

export default function PricingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-ink/10">
        <div className="blueprint-grid pointer-events-none absolute inset-0 -z-10 opacity-55" />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[42%] bg-cover bg-center opacity-35 md:block"
          style={{ backgroundImage: "url(/marketing/lifestyle/warehouse-bay.jpg)" }}
          aria-hidden
        />
        <div className="mx-auto max-w-[1200px] px-4 py-14 md:px-8 md:py-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Easy Rental"
            className="h-12 w-auto md:h-14"
            width={260}
            height={58}
          />
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-terra">
            Landlord listing plans · India C&amp;I
          </p>
          <h1 className="mt-3 max-w-[16ch] font-serif text-3xl font-medium tracking-tight md:text-5xl">
            List once. Lease direct.{" "}
            <span className="text-terra">{PRICING_META.noBrokerHeadline}</span>
          </h1>
          <p className="mt-4 max-w-[42ch] text-lg text-ink-soft">
            Year-round SaaS per active listed property — not a contact pack, not brokerage.
            Occupants browse, visit, and apply free.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="border border-terra/40 bg-terra/10 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-terra">
              {PRICING_META.noBrokerHeadline} · ₹0 brokerage
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
              Proposed · {PRICING_META.meter}
            </span>
          </div>
          <p className="mt-5 max-w-[48ch] text-sm leading-relaxed text-ink-soft">
            {PRICING_META.noBrokerBody}
          </p>
        </div>
      </section>

      {/* Plan cards */}
      <section className="mx-auto max-w-[1200px] px-4 py-14 md:px-8" aria-labelledby="plans-heading">
        <h2 id="plans-heading" className="font-serif text-2xl font-medium md:text-3xl">
          Plans for landlords
        </h2>
        <p className="mt-2 max-w-[52ch] text-ink-soft">
          Pay only for published, publicly findable stock. Draft properties do not consume a seat
          until you list them.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={[
                "flex flex-col border bg-paper-2 p-6",
                plan.highlighted
                  ? "border-terra ring-1 ring-terra/40"
                  : "border-ink/15",
              ].join(" ")}
            >
              {plan.highlighted ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-terra">
                  Most popular
                </p>
              ) : (
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                  {plan.id === "enterprise" ? "Sales" : "Annual"}
                </p>
              )}
              <h3 className="mt-2 font-serif text-2xl font-semibold">{plan.name}</h3>
              <p className="mt-2 text-sm text-ink-soft">{plan.tagline}</p>
              <p className="mt-6 font-serif text-4xl font-medium tracking-tight text-brand">
                {plan.priceLabel}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                {plan.periodLabel}
              </p>
              {plan.priceInrPerPropertyYear != null ? (
                <p className="mt-1 text-xs text-ink-soft">Proposed · excl. GST</p>
              ) : null}
              <ul className="mt-6 flex-1 space-y-2 text-sm text-ink-soft">
                {plan.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-terra" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className={[
                  "mt-8 inline-block px-4 py-2.5 text-center text-sm font-semibold",
                  plan.highlighted
                    ? "bg-terra text-paper hover:bg-terra-dark"
                    : "bg-brand text-paper hover:bg-brand-deep",
                ].join(" ")}
              >
                {plan.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-6 text-xs text-ink-soft">
          {PRICING_META.gstNote} {PRICING_META.trialNote}
        </p>
      </section>

      {/* No Broker callout */}
      <section className="border-y border-ink/10 bg-brand text-paper">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 md:grid-cols-[1.2fr_0.8fr] md:items-center md:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#9ed0e0]">
              Marketplace promise
            </p>
            <h2 className="mt-2 font-serif text-3xl font-medium md:text-4xl">
              {PRICING_META.noBrokerHeadline}
            </h2>
            <p className="mt-4 max-w-[48ch] text-paper/80">{PRICING_META.noBrokerBody}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="bg-paper px-4 py-2.5 text-sm font-semibold text-brand hover:bg-[#e8f2f6]"
              >
                Create landlord account
              </Link>
              <a
                href={WA_PRICING}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-paper/40 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-paper/10"
              >
                WhatsApp sales
              </a>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marketing/illustrations/leasing-desk.svg"
            alt=""
            className="w-full border border-white/15 bg-brand-deep object-cover"
          />
        </div>
      </section>

      {/* FAB */}
      <section
        className="mx-auto max-w-[1200px] px-4 py-14 md:px-8"
        aria-labelledby="fab-heading"
      >
        <h2 id="fab-heading" className="font-serif text-2xl font-medium md:text-3xl">
          Features → advantages → benefits
        </h2>
        <p className="mt-2 max-w-[52ch] text-ink-soft">
          Why landlords pay SaaS instead of brokerage or short contact packs.
        </p>
        <div className="mt-8 overflow-x-auto border border-ink/15">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-brand text-paper">
              <tr>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em]">
                  Feature
                </th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em]">
                  Advantage
                </th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em]">
                  Benefit
                </th>
              </tr>
            </thead>
            <tbody>
              {ADVANTAGES.map((row) => (
                <tr key={row.feature} className="border-t border-ink/10 odd:bg-paper-2">
                  <td className="px-4 py-3 font-medium text-ink">{row.feature}</td>
                  <td className="px-4 py-3 text-ink-soft">{row.advantage}</td>
                  <td className="px-4 py-3 text-ink-soft">{row.benefit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Feature matrix */}
      <section
        className="border-t border-ink/10 bg-paper-2"
        aria-labelledby="matrix-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 py-14 md:px-8">
          <h2 id="matrix-heading" className="font-serif text-2xl font-medium md:text-3xl">
            Feature matrix
          </h2>
          <p className="mt-2 max-w-[52ch] text-ink-soft">
            Basic, Growth, and Pro — all include No Broker! direct apply.
          </p>
          <div className="mt-8 overflow-x-auto border border-ink/15 bg-paper">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-brand text-paper">
                <tr>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em]">
                    Feature
                  </th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em]">
                    Basic
                  </th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em]">
                    Growth
                  </th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em]">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_MATRIX.map((row) => (
                  <tr key={row.feature} className="border-t border-ink/10 odd:bg-paper-2/80">
                    <td className="px-4 py-3 font-medium">{row.feature}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {formatMatrixCell(row.basic)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {formatMatrixCell(row.growth)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{formatMatrixCell(row.pro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section
        className="mx-auto max-w-[1200px] px-4 py-14 md:px-8"
        aria-labelledby="compare-heading"
      >
        <h2 id="compare-heading" className="font-serif text-2xl font-medium md:text-3xl">
          How we compare
        </h2>
        <p className="mt-2 max-w-[56ch] text-ink-soft">
          NoBroker-style amounts are research snapshots (often residential-adjacent). Easy Rental
          amounts are proposed — we do not invent live commercial SKUs.
        </p>
        <div className="mt-8 overflow-x-auto border border-ink/15">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-brand text-paper">
              <tr>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em]">
                  Dimension
                </th>
                {COMPARISON.map((col) => (
                  <th
                    key={col.id}
                    className={[
                      "px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em]",
                      col.id === "easy" ? "bg-terra" : "",
                    ].join(" ")}
                  >
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((label, i) => (
                <tr key={label} className="border-t border-ink/10 odd:bg-paper-2">
                  <td className="px-4 py-3 font-medium">{label}</td>
                  {COMPARISON.map((col) => (
                    <td
                      key={col.id}
                      className={[
                        "px-4 py-3 text-ink-soft",
                        col.id === "easy" ? "bg-terra/5 font-medium text-ink" : "",
                      ].join(" ")}
                    >
                      {col.cells[i]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Occupant strip + lifestyle */}
      <section className="border-t border-ink/10 bg-paper-2">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 md:grid-cols-2 md:items-center md:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-terra">
              For occupants
            </p>
            <h2 className="mt-2 font-serif text-2xl font-medium md:text-3xl">
              Browse &amp; apply free — No Broker!
            </h2>
            <p className="mt-3 max-w-[44ch] text-ink-soft">
              No owner-contact unlock packs. Find industrial stock on the map, book a visit, verify,
              and apply straight to the landlord.
            </p>
            <Link
              href="/listings"
              className="mt-6 inline-block bg-brand px-4 py-2.5 text-sm font-semibold text-paper hover:bg-brand-deep"
            >
              Browse listings
            </Link>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marketing/lifestyle/loading-dock.jpg"
            alt="Industrial loading dock"
            className="aspect-[16/10] w-full border border-ink/15 object-cover"
          />
        </div>
      </section>

      {/* CTA footer band */}
      <section className="border-t border-ink/10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-14 md:flex-row md:items-end md:justify-between md:px-8">
          <div>
            <h2 className="font-serif text-2xl font-medium">Ready to list?</h2>
            <p className="mt-2 max-w-[40ch] text-ink-soft">
              Sign up for a landlord org, or message us on WhatsApp. Checkout on this demo is a stub
              — no real charge.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="bg-brand px-4 py-2.5 text-sm font-semibold text-paper hover:bg-brand-deep"
            >
              Sign up
            </Link>
            <a
              href={WA_PRICING}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-ink/20 px-4 py-2.5 text-sm font-semibold text-brand hover:border-terra hover:text-terra"
            >
              WhatsApp
            </a>
            <a
              href={telHref(BRAND_CONTACT.salesPhoneE164)}
              className="border border-ink/20 px-4 py-2.5 text-sm font-semibold text-brand hover:border-terra hover:text-terra"
            >
              {BRAND_CONTACT.salesPhoneDisplay}
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

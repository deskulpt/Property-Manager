import Link from "next/link"
import type { ReactNode } from "react"

export function PartnerLandingShell({
  kicker,
  title,
  lede,
  heroImage,
  illustration,
  ctaHref,
  ctaLabel,
  steps,
  requirements,
  faq,
  secondaryHref,
  secondaryLabel,
  children,
}: {
  kicker: string
  title: string
  lede: string
  heroImage: string
  /** Optional navy+cyan line illustration for the steps band */
  illustration?: string
  ctaHref: string
  ctaLabel: string
  steps: { title: string; body: string }[]
  requirements: string[]
  faq: { q: string; a: string }[]
  secondaryHref: string
  secondaryLabel: string
  children?: ReactNode
}) {
  return (
    <div>
      <section className="relative isolate overflow-hidden border-b border-ink/10">
        <div className="blueprint-grid pointer-events-none absolute inset-0 -z-10 opacity-60" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_0%,rgb(14_110_140/0.16),transparent_55%)]"
          aria-hidden
        />
        <div className="mx-auto grid min-h-[min(70vh,620px)] max-w-[1200px] items-end gap-10 px-4 pb-14 pt-14 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pb-20">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Easy Rental" className="h-14 w-auto md:h-16" width={260} height={58} />
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-terra">{kicker}</p>
            <h1 className="mt-3 max-w-[20ch] font-serif text-3xl font-medium tracking-tight text-ink md:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-ink-soft md:text-lg">{lede}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={ctaHref}
                className="bg-brand px-5 py-3 text-sm font-semibold tracking-wide text-paper hover:bg-brand-deep"
              >
                {ctaLabel}
              </Link>
              <Link
                href={secondaryHref}
                className="border border-ink/25 bg-paper/80 px-5 py-3 text-sm font-semibold text-ink hover:border-terra hover:text-terra"
              >
                {secondaryLabel}
              </Link>
            </div>
          </div>
          <div className="relative hidden overflow-hidden border border-ink/15 md:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt="" className="aspect-[4/3] h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-terra">How it works</p>
        <div className={`mt-8 grid gap-8 ${illustration ? "md:grid-cols-[0.9fr_1.1fr] md:items-start" : ""}`}>
          {illustration ? (
            <div className="overflow-hidden border border-ink/15 bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={illustration} alt="" className="aspect-[16/9] w-full object-cover" />
            </div>
          ) : null}
          <ol className={`grid gap-6 ${illustration ? "" : "md:grid-cols-3"}`}>
            {steps.map((step, i) => (
              <li key={step.title} className="border border-ink/15 bg-paper-2 p-6">
                <span className="font-mono text-xs text-terra">0{i + 1}</span>
                <h2 className="mt-2 font-serif text-xl font-semibold text-ink">{step.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-ink/10 bg-paper-2">
        <div className="mx-auto max-w-[1200px] px-4 py-14 md:px-8">
          <h2 className="font-serif text-2xl font-semibold text-ink">Requirements</h2>
          <ul className="mt-4 grid gap-2 text-sm text-ink-soft md:max-w-2xl">
            {requirements.map((item) => (
              <li key={item} className="border-l-2 border-terra/40 pl-3">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-sm text-ink-faint">
            Identity checks are simulated for demo — not a live government verification (no UIDAI /
            NSDL calls).
          </p>
          <Link
            href={ctaHref}
            className="mt-6 inline-block bg-brand px-5 py-3 text-sm font-semibold text-paper hover:bg-brand-deep"
          >
            {ctaLabel}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-8">
        <h2 className="font-serif text-2xl font-semibold text-ink">FAQ</h2>
        <div className="mt-6 grid gap-4 md:max-w-3xl">
          {faq.map((item) => (
            <details key={item.q} className="border border-ink/15 bg-card p-4 open:bg-paper-2">
              <summary className="cursor-pointer font-semibold text-ink">{item.q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
        {children}
      </section>
    </div>
  )
}

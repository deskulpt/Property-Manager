import Link from "next/link"
import {
  formatInrFromPaise,
  INDICATION_PIPELINE,
  INDICATION_SIDE_STATUSES,
  PUBLISH_REWARD_PAISE,
} from "@/lib/referrals"

export const metadata = { title: "Refer & Earn" }

export default function ReferLandingPage() {
  return (
    <main>
      <section className="relative isolate overflow-hidden border-b border-ink/10">
        <div
          className="blueprint-grid pointer-events-none absolute inset-0 -z-10 opacity-70"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_0%,rgb(14_110_140/0.16),transparent_55%),radial-gradient(ellipse_at_90%_30%,rgb(19_37_58/0.1),transparent_50%)]"
          aria-hidden
        />
        <div className="mx-auto max-w-[1200px] px-4 pb-16 pt-14 md:px-8 md:pb-20 md:pt-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-terra">
            Refer & Earn · India C&I
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Easy Rental"
            width={420}
            height={84}
            className="mt-5 h-12 w-auto object-contain md:h-16"
          />
          <h1 className="mt-5 max-w-[22ch] font-serif text-3xl font-medium leading-snug tracking-tight text-ink md:text-4xl">
            Refer properties & earn
          </h1>
          <p className="mt-4 max-w-[44ch] text-base leading-relaxed text-ink-soft md:text-lg">
            Tip a warehouse, yard, or office. When it goes live — and when it leases — you earn
            proposed INR rewards on a demo ledger.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="border border-terra/40 bg-terra/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-terra-dark">
              Proposed · {formatInrFromPaise(PUBLISH_REWARD_PAISE)} published
            </span>
            <span className="border border-brand/25 bg-brand/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-brand">
              Proposed · 5% first month on lease
            </span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/refer/submit"
              className="bg-brand px-5 py-3 text-sm font-semibold tracking-wide text-paper hover:bg-brand-deep"
            >
              Submit a property
            </Link>
            <Link
              href="/refer/link"
              className="border border-ink/25 bg-paper/80 px-5 py-3 text-sm font-semibold tracking-wide text-ink hover:border-terra hover:text-terra"
            >
              Get my referral link
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-14 md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-terra">How it works</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight">Three steps</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            ["01", "Submit or share", "Send property + landlord contact, or share your personal link so the owner self-registers."],
            ["02", "We confirm", "Easy Rental prospects the landlord, gathers media, and publishes when ready."],
            ["03", "Earn on milestones", "Proposed ₹2,000 when Published; 5% of first-month rent when Leased. Demo payouts only."],
          ].map(([n, title, body]) => (
            <li key={n} className="border-t border-ink/20 pt-4">
              <p className="font-mono text-[11px] text-ink-faint">{n}</p>
              <h3 className="mt-2 font-serif text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-ink/10 bg-paper-2">
        <div className="mx-auto max-w-[1200px] px-4 py-14 md:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-terra">Status pipeline</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight">Track every tip</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {INDICATION_PIPELINE.map((s, i) => (
              <span
                key={s.status}
                className="inline-flex items-center gap-2 border border-ink/15 bg-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink"
              >
                {i > 0 ? <span className="text-ink-faint">→</span> : null}
                {s.label}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            Side states:{" "}
            {INDICATION_SIDE_STATUSES.map((s) => s.label).join(" · ")}. Attribution expires in{" "}
            <span className="font-semibold text-ink">90 days</span> if not Published.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 md:grid-cols-[1.2fr_0.8fr] md:px-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-terra">Rules</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight">Trust first</h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink-soft">
            <li>Referrers must be 18+.</li>
            <li>Owner consent required before we contact the landlord.</li>
            <li>No self-referral (same phone or email as the landlord).</li>
            <li>Do not scrape landlord contacts from third-party listing sites.</li>
            <li>90-day window to reach Published — else Deactivated.</li>
            <li>
              Payouts are <span className="font-semibold text-ink">DEMO</span> — simulated ledger
              only; no real bank / NEFT / RazorpayX transfers.
            </li>
            <li>
              Owner tip (proposed FAQ): landlords who use a referral link may get a ₹2,000 package /
              fee credit — not automated in this MVP.
            </li>
          </ul>
        </div>
        <aside className="border border-ink/15 bg-card p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">
            Partner landlords (Pro)
          </p>
          <h3 className="mt-2 font-serif text-lg font-semibold">SaaS affiliate — coming soon</h3>
          <p className="mt-2 text-sm text-ink-soft">
            Realtors, architects, and contractors who enrol landlords on Easy Rental SaaS will earn
            a separate 20% subscription commission (§19B). Not the same as Refer & Earn.
          </p>
          <Link
            href="/partners"
            className="mt-4 inline-block text-sm font-semibold text-terra underline underline-offset-4"
          >
            Become a partner
          </Link>
          <div className="mt-6 border-t border-ink/10 pt-4">
            <Link
              href="/refer/dashboard"
              className="text-sm font-semibold text-brand underline underline-offset-4"
            >
              Open demo referrer dashboard
            </Link>
          </div>
        </aside>
      </section>
    </main>
  )
}

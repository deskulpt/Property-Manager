import Link from "next/link"
import { BrandLogo } from "@/components/brand-logo"
import { formatInrPaise, PUBLISH_REWARD_PAISE, STATUS_LABELS } from "@/lib/referrals"

export const metadata = { title: "Refer & Earn" }

const STEPS = [
  {
    n: "01",
    title: "Submit or share",
    body: "Send us a C&I address with owner consent, or share your personal link so the landlord self-registers.",
  },
  {
    n: "02",
    title: "We confirm with the landlord",
    body: "Easy Rental prospects the lead, collects media, and publishes when the listing is ready.",
  },
  {
    n: "03",
    title: "Earn on publish and lease",
    body: "Demo rewards land in your ledger when the indication reaches Published, then again on first lease.",
  },
]

const PIPELINE = [
  "new",
  "prospecting",
  "awaiting_media",
  "published",
  "in_negotiation",
  "leased",
] as const

export default function ReferLandingPage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-ink/10 bg-[linear-gradient(160deg,#0a1624_0%,#13253a_48%,#0e6e8c_140%)] text-paper">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-16 md:px-8 md:py-24">
          <BrandLogo variant="white" size="hero" href="/refer" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#9ed0e0]">
            Refer & Earn · India C&I
          </p>
          <h1 className="max-w-3xl font-heading text-3xl font-extrabold tracking-tight md:text-5xl">
            Source a warehouse.
            <span className="text-[#9ed0e0]"> Earn when it lists.</span>
          </h1>
          <p className="max-w-xl text-lg text-paper/75">
            Refer commercial and industrial property across India. Proposed demo rewards:{" "}
            <strong className="text-paper">{formatInrPaise(PUBLISH_REWARD_PAISE)}</strong> when Published,{" "}
            <strong className="text-paper">5%</strong> of first-month rent when Leased.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/refer/submit"
              className="inline-flex h-11 items-center bg-[#9ed0e0] px-5 font-heading text-sm font-bold text-brand"
            >
              Submit a property
            </Link>
            <Link
              href="/refer/link"
              className="inline-flex h-11 items-center border border-paper/35 px-5 font-heading text-sm font-bold text-paper"
            >
              Get my referral link
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/50">
              Proposed · demo ledger only
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-14 md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">How it works</p>
        <h2 className="mt-2 font-heading text-3xl font-extrabold">Three steps. Clear milestones.</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="border-t border-ink/15 pt-4">
              <p className="font-mono text-[11px] text-terra">{step.n}</p>
              <h3 className="mt-2 font-heading text-xl font-bold">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-ink/10 bg-paper-2/60">
        <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">Status pipeline</p>
          <h2 className="mt-2 font-heading text-2xl font-extrabold">Track every indication in English</h2>
          <ol className="mt-6 flex flex-wrap gap-2">
            {PIPELINE.map((status, i) => (
              <li
                key={status}
                className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft"
              >
                <span className="border border-ink/15 bg-card px-2 py-1 text-ink">
                  {STATUS_LABELS[status]}
                </span>
                {i < PIPELINE.length - 1 ? <span aria-hidden>→</span> : null}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-ink-faint">
            Side exits: Discarded · Deactivated (includes 90-day attribution expiry).
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 md:grid-cols-[1.2fr_0.8fr] md:px-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">Rules</p>
          <h2 className="mt-2 font-heading text-2xl font-extrabold">Trust before outreach</h2>
          <ul className="mt-5 grid gap-3 text-sm text-ink-soft">
            <li>Referrers must be 18+.</li>
            <li>Owner consent is required before we contact the landlord.</li>
            <li>No self-referral (same phone or email as the landlord).</li>
            <li>Do not scrape landlord contacts from third-party listing sites.</li>
            <li>Attribution is valid for 90 days to reach Published.</li>
            <li>Payouts in this demo are simulated — no real bank or UPI transfer.</li>
          </ul>
        </div>
        <aside className="border border-ink/10 bg-card p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">Demo seed</p>
          <h3 className="mt-2 font-heading text-xl font-bold">Try as Asha Reddy</h3>
          <p className="mt-2 text-sm text-ink-soft">
            Switch identity to <strong>Asha Reddy · Refer & Earn</strong> (code{" "}
            <code className="font-mono text-terra">EASY-ASHA</code>) to see seeded indications and the INR
            ledger.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link href="/refer/dashboard" className="font-heading text-sm font-bold text-terra underline">
              Referrer dashboard
            </Link>
            <Link href="/refer/rewards" className="font-heading text-sm font-bold text-terra underline">
              Rewards ledger
            </Link>
            <Link href="/partners" className="font-heading text-sm font-bold text-ink-soft underline">
              Become a partner (§19B stub)
            </Link>
          </div>
        </aside>
      </section>
    </main>
  )
}

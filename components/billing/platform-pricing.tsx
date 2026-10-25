import Link from "next/link"
import {
  ANNUAL_MULTIPLIER,
  GST_BPS,
  SALE_MONTHLY_PAISE,
  SEGMENT_LABEL,
  STANDARD_FROM_LABEL,
  STANDARD_MONTHLY_PAISE,
  formatInrPaise,
  isSaleActive,
  type BillableSegment,
} from "@/lib/billing/pricing"
import { countPayingBillingAccounts } from "@/lib/billing/store"

const SEGMENTS: BillableSegment[] = ["homes", "retail_office", "industrial"]

export function PlatformPricing({ nowMs }: { nowMs: number }) {
  const paying = countPayingBillingAccounts()
  const saleOn = isSaleActive(nowMs, paying)

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 md:px-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">Platform billing</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold text-ink">Per-unit plans for landlords</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">
        Free includes 1 unit. Paid plans meter Homes, Retail &amp; Office, and Industrial. Prices are
        exclusive of GST; checkout shows <strong>+18% GST inclusive</strong>. Annual ={" "}
        {ANNUAL_MULTIPLIER}× monthly. Occupants browse and apply free.
      </p>

      {saleOn ? (
        <p className="mt-4 border border-terra/30 bg-terra/10 px-4 py-3 text-sm text-ink" role="status">
          Launch sale active through 31 Mar 2027 (IST) or the first 500 paying accounts (currently{" "}
          {paying}/500). No countdown timers — see struck-through{" "}
          <span className="font-medium">{STANDARD_FROM_LABEL}</span>.
        </p>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">
          Launch sale window closed or capped. Standard catalogue prices apply (volume discounts still
          available).
        </p>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {SEGMENTS.map((segment) => {
          const standard = STANDARD_MONTHLY_PAISE[segment]
          const sale = SALE_MONTHLY_PAISE[segment]
          const showSale = saleOn
          return (
            <article key={segment} className="border border-ink/15 bg-card p-5">
              <h2 className="font-sans text-xl font-extrabold text-ink">{SEGMENT_LABEL[segment]}</h2>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                Per unit / month
              </p>
              {showSale ? (
                <div className="mt-4">
                  <p className="text-3xl font-black text-ink">{formatInrPaise(sale)}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="line-through">{formatInrPaise(standard)}</span>{" "}
                    <span className="text-ink-faint">{STANDARD_FROM_LABEL}</span>
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-3xl font-black text-ink">{formatInrPaise(standard)}</p>
              )}
              <p className="mt-2 text-sm text-ink-soft">
                Annual: {formatInrPaise((showSale ? sale : standard) * ANNUAL_MULTIPLIER)} (excl. GST)
              </p>
              <p className="mt-1 text-xs text-ink-faint">
                Checkout adds GST {GST_BPS / 100}%
              </p>
            </article>
          )
        })}
      </div>

      <section className="mt-12 grid gap-3 border-t border-ink/10 pt-8 text-sm text-ink-soft">
        <h2 className="font-sans text-lg font-extrabold text-ink">Also included</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Free: 1 unit. Cancel anytime from Billing — as easy as signing up.</li>
          <li>Volume: 6–20 units −15%, 21–50 units −25% (does not stack with sale; we apply the better deal).</li>
          <li>12-month price lock from the day you join a paid plan.</li>
          <li>Test-mode checkout only — no live payment keys in this build.</li>
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/landlord/billing"
          className="bg-brand px-5 py-3 text-sm font-semibold text-paper hover:bg-brand-deep"
        >
          Open billing desk
        </Link>
        <Link
          href="/signup"
          className="border border-ink/25 px-5 py-3 text-sm font-semibold text-ink hover:border-terra"
        >
          Create landlord account
        </Link>
      </div>
    </div>
  )
}

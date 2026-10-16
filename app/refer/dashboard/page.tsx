import Link from "next/link"
import { demoAdvanceIndication } from "@/lib/actions"
import {
  ensureReferrerForDemo,
  listIndicationsForReferrer,
  referrerRewardTotals,
} from "@/lib/db"
import {
  formatInrFromPaise,
  indicationStatusLabel,
  maskPhone,
  nextIndicationStatus,
} from "@/lib/referrals"
import { PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"

export const metadata = { title: "Referrer dashboard" }

export default async function ReferDashboardPage() {
  const referrer = ensureReferrerForDemo()
  const indications = listIndicationsForReferrer(referrer.id)
  const totals = referrerRewardTotals(referrer.id)

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-8">
      <PageHeader
        kicker="Refer & Earn · Demo referrer"
        title={`${referrer.name}'s indications`}
        lede={`Code ${referrer.code}. Demo identity — payouts are simulated; no real bank transfer.`}
      />

      <div
        className="mb-6 border border-pending/40 bg-pending/10 px-4 py-3 text-sm text-ink"
        role="status"
      >
        Payouts are simulated — no real bank transfer. Ledger statuses: accrued → payable →
        paid_demo.
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {[
          ["Accrued (DEMO)", totals.accrued],
          ["Payable (DEMO)", totals.payable],
          ["Paid demo", totals.paid],
        ].map(([label, paise]) => (
          <div key={String(label)} className="border border-ink/15 bg-card px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              {label}
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold text-brand">
              {formatInrFromPaise(Number(paise))}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/refer/rewards" className="font-semibold text-terra hover:underline">
          Rewards ledger
        </Link>
        <Link href="/refer/link" className="font-semibold text-terra hover:underline">
          Share link
        </Link>
        <Link href="/refer/submit" className="font-semibold text-terra hover:underline">
          Submit property
        </Link>
      </div>

      {indications.length === 0 ? (
        <div className="border border-dashed border-ink/20 bg-card px-6 py-12 text-center">
          <p className="font-serif text-xl font-semibold">No indications yet</p>
          <p className="mt-2 text-sm text-ink-soft">Submit a C&I tip to start the pipeline.</p>
          <Link
            href="/refer/submit"
            className="mt-4 inline-block font-semibold text-terra underline underline-offset-4"
          >
            Submit a property
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto border border-ink/15">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-brand text-paper">
              <tr className="font-mono text-[10px] uppercase tracking-[0.12em]">
                <th className="px-3 py-2.5 font-medium">Property</th>
                <th className="px-3 py-2.5 font-medium">Landlord</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Created</th>
                <th className="px-3 py-2.5 font-medium">Expires</th>
                <th className="px-3 py-2.5 font-medium">Demo</th>
              </tr>
            </thead>
            <tbody>
              {indications.map((ind) => {
                const next = nextIndicationStatus(ind.status)
                return (
                  <tr key={ind.id} className="border-t border-ink/10 bg-card">
                    <td className="px-3 py-3">
                      <p className="font-medium text-ink">
                        {ind.city} · {ind.area}
                      </p>
                      <p className="font-mono text-[11px] text-ink-faint">
                        {ind.propertyType.replace("_", " ")}
                        {ind.approxSqft ? ` · ${ind.approxSqft.toLocaleString("en-IN")} SF` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <p>{ind.landlordName}</p>
                      <p className="font-mono text-[11px] text-ink-faint">
                        {maskPhone(ind.landlordPhone)}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={ind.status} />
                      <span className="sr-only">{indicationStatusLabel(ind.status)}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-ink-soft">
                      {ind.createdAt.slice(0, 10)}
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-ink-soft">
                      {ind.attributionExpiresAt.slice(0, 10)}
                    </td>
                    <td className="px-3 py-3">
                      {next ? (
                        <form action={demoAdvanceIndication}>
                          <input type="hidden" name="indicationId" value={ind.id} />
                          <SubmitButton
                            pendingLabel="…"
                            className="h-8 border border-ink/20 bg-paper px-2 text-[11px] font-semibold text-ink hover:border-terra"
                          >
                            → {indicationStatusLabel(next)}
                          </SubmitButton>
                        </form>
                      ) : (
                        <span className="font-mono text-[10px] uppercase text-ink-faint">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

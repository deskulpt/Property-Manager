import Link from "next/link"
import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { cmsAdvanceIndication } from "@/lib/actions"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { listAllIndications } from "@/lib/db"
import { formatDay } from "@/lib/format"
import { isOpsFlagOn } from "@/lib/platform-ops"
import { maskPhone, nextPipelineStatus, STATUS_LABELS } from "@/lib/referrals"
import { listPartnerReferrals } from "@/lib/partners/store"

export const metadata = { title: "Referrals · Command center" }

export default async function ConsoleReferralsPage() {
  await requirePlatformAdmin()
  const enabled = isOpsFlagOn("refer_earn")
  const indications = listAllIndications()
  const partnerReferrals = listPartnerReferrals()

  return (
    <div data-testid="console-referrals">
      <PageHeader
        kicker="Refer & Earn"
        title="Referrals CMS"
        lede="Advance landlord indications (demo INR rewards) and partner-to-partner invites from one desk."
      />
      {!enabled ? (
        <p className="mb-4 border border-pending/30 bg-pending/10 px-3 py-2 text-sm">
          Refer & Earn flag is off —{" "}
          <Link href="/console/flags" className="font-semibold text-terra underline">
            enable in Flags
          </Link>
          .
        </p>
      ) : null}

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-xl font-semibold text-brand">Landlord indications</h2>
        {indications.length === 0 ? (
          <EmptyState
            title="No indications yet"
            body="Public submit at /refer/submit creates rows here for staff advance."
            action={{ href: "/refer/submit", label: "Create a referral indication" }}
          />
        ) : (
          <div className="overflow-x-auto border border-brand/15">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-brand/[0.04] font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                <tr>
                  <th className="px-3 py-3">Property</th>
                  <th className="px-3 py-3">Referrer</th>
                  <th className="px-3 py-3">Landlord</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {indications.map((ind) => {
                  const next = nextPipelineStatus(ind.status)
                  return (
                    <tr key={ind.id} className="border-t border-brand/10 align-top">
                      <td className="px-3 py-3">
                        <p className="font-semibold">
                          {ind.propertyCity} · {ind.propertyType}
                        </p>
                        <p className="text-xs text-ink-faint">{ind.propertyAddress}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p>{ind.referrerName}</p>
                        <p className="font-mono text-xs text-terra">{ind.referrerCode}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p>{ind.landlordName}</p>
                        <p className="font-mono text-xs">{maskPhone(ind.landlordPhone)}</p>
                        <p className="text-xs text-ink-faint">
                          Consent {ind.consentAt ? formatDay(ind.consentAt.slice(0, 10)) : "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={ind.status} />
                        <p className="mt-1 font-mono text-[10px] text-ink-faint">
                          {STATUS_LABELS[ind.status] ?? ind.status}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        {next ? (
                          <form action={cmsAdvanceIndication}>
                            <input type="hidden" name="indicationId" value={ind.id} />
                            <input type="hidden" name="toStatus" value={next} />
                            {next === "leased" ? (
                              <input
                                type="hidden"
                                name="leasedRentInr"
                                value={String(
                                  Math.round((ind.askingRentPaise ?? 1_800_000_00) / 100),
                                )}
                              />
                            ) : null}
                            <button
                              type="submit"
                              className="border border-terra/40 bg-terra/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-terra-dark hover:bg-terra/20"
                            >
                              → {STATUS_LABELS[next] ?? next}
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-ink-faint">Terminal</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold text-brand">Partner referrals</h2>
        {partnerReferrals.length === 0 ? (
          <EmptyState
            title="No partner-to-partner referrals"
            body="Rows appear when /partners/refer is used."
            action={{ href: "/partners/refer", label: "Open partner refer form" }}
          />
        ) : (
          <ul className="grid gap-2">
            {partnerReferrals.map((ref) => (
              <li
                key={ref.id}
                className="flex flex-wrap items-center justify-between gap-2 border border-brand/15 bg-card px-4 py-3"
              >
                <div>
                  <p className="font-semibold">
                    {ref.referrerName} → {ref.referredName}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {ref.track}/{ref.subtype} · {ref.city}
                  </p>
                </div>
                <StatusBadge status={ref.status === "converted" ? "verified" : "pending"} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

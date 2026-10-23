import { PageHeader, StatusBadge } from "@/components/product"
import { cmsAdvanceIndication } from "@/lib/actions"
import { listAllIndications } from "@/lib/db"
import { formatDay } from "@/lib/format"
import { canListPersona } from "@/lib/permissions"
import { maskPhone, nextPipelineStatus, STATUS_LABELS } from "@/lib/referrals"
import { getSessionUser } from "@/lib/session"
import { redirect } from "next/navigation"

export const metadata = { title: "CMS · Referrals" }

export default async function CmsReferralsPage() {
  const user = await getSessionUser()
  if (!user || !canListPersona(user.role, "referrals")) {
    redirect("/cms")
  }

  const indications = listAllIndications()

  return (
    <div>
      <PageHeader
        kicker="Refer & Earn"
        title="Indications desk"
        lede="Advance the English pipeline. Published accrues ₹2,000 demo; Leased accrues 5% of first-month rent. No live payouts."
      />
      <div className="overflow-x-auto border border-ink/10">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-paper-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            <tr>
              <th className="px-3 py-3">Property</th>
              <th className="px-3 py-3">Referrer</th>
              <th className="px-3 py-3">Landlord</th>
              <th className="px-3 py-3">Consent</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {indications.map((ind) => {
              const next = nextPipelineStatus(ind.status)
              return (
                <tr key={ind.id} className="border-t border-ink/10 align-top">
                  <td className="px-3 py-3">
                    <p className="font-heading font-bold">
                      {ind.propertyCity} · {ind.propertyType}
                    </p>
                    <p className="text-xs text-ink-faint">{ind.propertyAddress}</p>
                    <p className="mt-1 font-mono text-[10px] text-ink-faint">{ind.id}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p>{ind.referrerName}</p>
                    <p className="font-mono text-xs text-terra">{ind.referrerCode}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p>{ind.landlordName}</p>
                    <p className="font-mono text-xs">{maskPhone(ind.landlordPhone)}</p>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {ind.consentAt ? formatDay(ind.consentAt.slice(0, 10)) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={ind.status} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-2">
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
                            className="font-mono text-[10px] uppercase tracking-wider text-terra underline"
                          >
                            → {STATUS_LABELS[next]}
                          </button>
                        </form>
                      ) : null}
                      {ind.status !== "discarded" && ind.status !== "deactivated" && ind.status !== "leased" ? (
                        <form action={cmsAdvanceIndication}>
                          <input type="hidden" name="indicationId" value={ind.id} />
                          <input type="hidden" name="toStatus" value="discarded" />
                          <button
                            type="submit"
                            className="font-mono text-[10px] uppercase tracking-wider text-destructive underline"
                          >
                            Discard
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {indications.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No indications yet.</p>
      ) : null}
    </div>
  )
}

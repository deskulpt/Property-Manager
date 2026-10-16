import { redirect } from "next/navigation"
import { demoAdvanceIndication, demoDiscardIndication } from "@/lib/actions"
import { listAllIndications } from "@/lib/db"
import { indicationStatusLabel, maskPhone, nextIndicationStatus } from "@/lib/referrals"
import { isStaffRole } from "@/lib/format"
import { getSessionUser } from "@/lib/session"
import { PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"

export const metadata = { title: "CMS · Referrals" }

export default async function CmsReferralsPage() {
  const session = await getSessionUser()
  if (!session || !isStaffRole(session.role)) {
    redirect("/login")
  }

  const indications = listAllIndications()

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-8">
      <PageHeader
        kicker="Platform CMS"
        title="Refer & Earn indications"
        lede="Advance statuses, discard bad leads. Consent timestamps are stored on each row. DEMO rewards only."
      />

      <div className="overflow-x-auto border border-ink/15">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-brand text-paper">
            <tr className="font-mono text-[10px] uppercase tracking-[0.12em]">
              <th className="px-3 py-2.5 font-medium">Property</th>
              <th className="px-3 py-2.5 font-medium">Landlord</th>
              <th className="px-3 py-2.5 font-medium">Consent</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {indications.map((ind) => {
              const next = nextIndicationStatus(ind.status)
              return (
                <tr key={ind.id} className="border-t border-ink/10 bg-card">
                  <td className="px-3 py-3">
                    <p className="font-medium">
                      {ind.city} · {ind.area}
                    </p>
                    <p className="font-mono text-[11px] text-ink-faint">{ind.path}</p>
                  </td>
                  <td className="px-3 py-3">
                    {ind.landlordName}
                    <br />
                    <span className="font-mono text-[11px] text-ink-faint">
                      {maskPhone(ind.landlordPhone)}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px]">
                    {ind.consentAt.slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={ind.status} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {next ? (
                        <form action={demoAdvanceIndication}>
                          <input type="hidden" name="indicationId" value={ind.id} />
                          <SubmitButton
                            pendingLabel="…"
                            className="h-8 border border-ink/20 px-2 text-[11px] font-semibold"
                          >
                            → {indicationStatusLabel(next)}
                          </SubmitButton>
                        </form>
                      ) : null}
                      {ind.status !== "leased" &&
                      ind.status !== "discarded" &&
                      ind.status !== "deactivated" ? (
                        <form action={demoDiscardIndication}>
                          <input type="hidden" name="indicationId" value={ind.id} />
                          <SubmitButton
                            pendingLabel="…"
                            className="h-8 border border-destructive/30 px-2 text-[11px] font-semibold text-destructive"
                          >
                            Discard
                          </SubmitButton>
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
    </div>
  )
}

import Link from "next/link"
import { EmptyState, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { reviewApplicationAsDesk } from "@/lib/actions"
import { formatDay } from "@/lib/format"

type AppRow = {
  id: string
  unitCode: string
  propertyName: string
  propertySlug: string
  company: string
  contactName: string
  email: string
  intendedUse: string
  status: string
  createdAt: string
}

export function ApplicationDesk({
  applications,
  counts,
}: {
  applications: AppRow[]
  counts: { pending: number; approved: number; denied: number }
}) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-3" data-testid="application-counts">
        {[
          { label: "Pending", value: counts.pending },
          { label: "Approved", value: counts.approved },
          { label: "Rejected", value: counts.denied },
        ].map((item) => (
          <div key={item.label} className="border border-ink/10 bg-card px-4 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">{item.label}</p>
            <p className="font-serif text-xl font-semibold text-brand">{item.value}</p>
          </div>
        ))}
      </div>
      {applications.length === 0 ? (
        <EmptyState
          title="No applications"
          body="When an applicant applies on a public bay, the queue appears here."
          action={{ href: "/listings", label: "Browse public listings" }}
        />
      ) : (
        <div className="grid gap-3">
          {applications.map((application) => (
            <article key={application.id} className="border border-ink/10 bg-card p-4" data-testid={`app-row-${application.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-lg font-semibold">
                  Unit {application.unitCode} · {application.propertyName}
                </h2>
                <StatusBadge status={application.status} />
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {application.company} · {application.contactName} · {application.email}
              </p>
              <p className="mt-1 text-sm">{application.intendedUse}</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                {formatDay(application.createdAt.slice(0, 10))}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  href={`/properties/${application.propertySlug}/units/${application.unitCode}`}
                  className="text-sm font-semibold text-terra hover:underline"
                >
                  View bay
                </Link>
                {application.status === "submitted" ? (
                  <>
                    <form action={reviewApplicationAsDesk}>
                      <input type="hidden" name="applicationId" value={application.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <SubmitButton data-testid={`approve-${application.id}`} pendingLabel="Approving…">
                        Approve
                      </SubmitButton>
                    </form>
                    <form action={reviewApplicationAsDesk}>
                      <input type="hidden" name="applicationId" value={application.id} />
                      <input type="hidden" name="decision" value="denied" />
                      <SubmitButton variant="outline" data-testid={`deny-${application.id}`} pendingLabel="Rejecting…">
                        Reject
                      </SubmitButton>
                    </form>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

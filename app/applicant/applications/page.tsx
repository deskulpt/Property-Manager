import Link from "next/link"
import { DoNextFaq } from "@/components/cms/do-next-faq"
import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { applicationsForApplicant } from "@/lib/db"
import { formatDay } from "@/lib/format"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "My applications" }

export default async function ApplicantApplicationsPage() {
  const user = await getSessionUser()
  if (!user) return null
  const applications = applicationsForApplicant(user.id)
  return (
    <div>
      <PageHeader kicker="Pipeline" title="Applications" lede="Status moves from submitted → approved or rejected when a landlord or managing agent decides." />
      {applications.length === 0 ? (
        <EmptyState title="No applications yet" body="Open a bay from the portfolio and apply." action={{ href: "/properties", label: "Browse buildings" }} />
      ) : (
        <div className="grid gap-3">
          {applications.map((application) => (
            <article key={application.id} className="border border-ink/10 bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-lg font-semibold">
                  Unit {application.unitCode} · {application.propertyName}
                </h2>
                <StatusBadge status={application.status} />
              </div>
              <p className="mt-1 text-sm text-ink-soft">{application.intendedUse}</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                {formatDay(application.createdAt.slice(0, 10))}
              </p>
              <ol className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                {["submitted", "approved", "denied"].map((step) => (
                  <li
                    key={step}
                    className={
                      application.status === step
                        ? "border border-terra bg-terra/10 px-2 py-1 text-terra"
                        : "border border-ink/10 px-2 py-1"
                    }
                  >
                    {step === "denied" ? "rejected" : step}
                  </li>
                ))}
              </ol>
              <Link
                href={`/properties/${application.propertySlug}/units/${application.unitCode}`}
                className="mt-3 inline-block text-sm font-semibold text-terra hover:underline"
              >
                View the bay
              </Link>
            </article>
          ))}
        </div>
      )}
      <DoNextFaq
        steps={[
          { title: "Finish verify if pending", body: "Landlords prefer applicants with demo ID complete." },
          { title: "Book visits on shortlists", body: "Use the unit page visit form." },
          { title: "Prepare for e-sign", body: "Approved deals move to agreement packets." },
        ]}
        faqs={[
          { q: "Why was I rejected?", a: "Usually another applicant was approved on the same bay, or the landlord declined the intended use." },
        ]}
      />
    </div>
  )
}

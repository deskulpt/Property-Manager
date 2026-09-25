import { EmptyState, PageHeader } from "@/components/product"
import { cmsApplicants } from "@/lib/db"
import { canListPersona, staffCapabilities } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Applicants" }

export default async function CmsApplicantsPage() {
  const user = await getSessionUser()
  if (!user || !canListPersona(user.role, "applicants")) {
    return (
      <EmptyState
        title="Not in your desk"
        body="Applicants are visible to Super Admins, Account Managers, and Property Managers (masked email)."
      />
    )
  }
  const caps = staffCapabilities(user.role)!
  const people = cmsApplicants(user)
  return (
    <div>
      <PageHeader
        kicker="Personas"
        title="Applicants"
        lede={
          caps.seeFullEmail
            ? "Prospects and approved occupants across the platform."
            : "Contacts are masked for Property Managers. Merchandisers do not open this desk."
        }
      />
      {people.length === 0 ? (
        <EmptyState title="No applicants" body="None seeded for this view." />
      ) : (
        <div className="grid gap-3">
          {people.map((person) => (
            <article key={person.id} className="bg-card p-4 ring-1 ring-foreground/10">
              <h2 className="font-sans text-xl font-extrabold">{person.name}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {person.company ?? "Company unknown"}
                {person.email ? ` · ${person.email}` : " · email hidden"}
              </p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">{person.meta}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

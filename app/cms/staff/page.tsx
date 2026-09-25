import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { cmsPlatformStaff } from "@/lib/db"
import { canListPersona } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"
import { roleLabel } from "@/lib/format"

export const metadata = { title: "Platform staff" }

export default async function CmsStaffPage() {
  const user = await getSessionUser()
  if (!user || !canListPersona(user.role, "platform_staff")) {
    return <EmptyState title="Not in your desk" body="Only Super Admins see the platform staff roster." />
  }
  const staff = cmsPlatformStaff(user)
  return (
    <div>
      <PageHeader
        kicker="Personas"
        title="Platform staff"
        lede="Operators of the SaaS Super Admin Org. Feature isolation is enforced by staff role, not by hiding the switcher."
      />
      <div className="grid gap-3">
        {staff.map((person) => (
          <article key={person.id} className="bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-sans text-xl font-extrabold">{person.name}</h2>
              <StatusBadge status="approved" />
            </div>
            <p className="mt-1 text-sm text-ink-soft">{roleLabel(person.role)} · {person.email}</p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">{person.meta}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

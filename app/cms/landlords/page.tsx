import { EmptyState, PageHeader } from "@/components/product"
import { InviteLandlordForm } from "@/components/cms/invite-landlord"
import { cmsLandlords } from "@/lib/db"
import { canListPersona, staffCapabilities } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Landlords" }

export default async function CmsLandlordsPage() {
  const user = await getSessionUser()
  if (!user || !canListPersona(user.role, "landlords")) {
    return <EmptyState title="Not in your desk" body="Account Managers and Super Admins manage landlord organisations." />
  }
  const { orgs, admins } = cmsLandlords(user)
  const caps = staffCapabilities(user.role)!
  return (
    <div className="grid gap-10">
      <div>
        <PageHeader
          kicker="Personas"
          title="Landlord organisations"
          lede="Every landlord tenant on the platform. Invite creates a demo org and admin you can switch into from the header."
        />
        <div className="grid gap-3">
          {orgs.map((org) => (
            <article key={org.id} className="bg-card p-4 ring-1 ring-foreground/10">
              <h2 className="font-sans text-xl font-extrabold">{org.name}</h2>
              <p className="mt-1 text-sm text-ink-soft">{org.city} · {org.slug}</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                {org.adminCount} admin · {org.propertyCount} building{org.propertyCount === 1 ? "" : "s"}
              </p>
            </article>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-3 font-sans text-2xl font-extrabold">Landlord admins</h2>
        <div className="grid gap-3">
          {admins.map((admin) => (
            <article key={admin.id} className="bg-card p-4 ring-1 ring-foreground/10">
              <h3 className="font-sans text-lg font-extrabold">{admin.name}</h3>
              <p className="text-sm text-ink-soft">{admin.email}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">{admin.tenantName}</p>
            </article>
          ))}
        </div>
      </div>
      {caps.inviteLandlord ? (
        <div>
          <h2 className="mb-3 font-sans text-2xl font-extrabold">Invite a landlord</h2>
          <InviteLandlordForm />
        </div>
      ) : null}
    </div>
  )
}

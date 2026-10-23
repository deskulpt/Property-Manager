import { PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import {
  consoleImpersonateTenant,
  consoleSetTenantPackage,
  consoleSetTenantStatus,
} from "@/lib/actions"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { platformLandlordDirectory } from "@/lib/db"
import { planLabel, type PlanId } from "@/lib/plans"

export const metadata = { title: "Tenants · Console" }

function nextSelfServePlan(current: PlanId): PlanId {
  if (current === "starter") return "growth"
  if (current === "growth") return "pro"
  return "starter"
}

export default async function ConsoleTenantsPage() {
  await requirePlatformAdmin()
  const orgs = platformLandlordDirectory()
  return (
    <div>
      <PageHeader
        kicker="Directory"
        title="Landlord tenants"
        lede="View organisations, cycle Basic / Growth / Pro entitlements, suspend, or switch into a landlord admin via the sticky bar."
      />
      <div className="grid gap-4">
        {orgs.map((org) => {
          const next = nextSelfServePlan(org.package)
          return (
          <article key={org.id} className="grid gap-3 border border-ink/10 bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-serif text-xl font-semibold">{org.name}</h2>
                <p className="text-sm text-ink-soft">
                  {org.city} · {org.slug} · {org.propertyCount} building
                  {org.propertyCount === 1 ? "" : "s"}
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  TenantID: {org.id}
                  {org.adminName ? ` · Admin: ${org.adminName}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={org.status === "active" ? "verified" : "pending"} />
                <span className="font-mono text-[11px] uppercase tracking-wider text-terra">
                  {planLabel(org.package)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={consoleSetTenantStatus}>
                <input type="hidden" name="tenantId" value={org.id} />
                <input
                  type="hidden"
                  name="status"
                  value={org.status === "active" ? "suspended" : "active"}
                />
                <SubmitButton variant="outline" pendingLabel="Saving…">
                  {org.status === "active" ? "Suspend" : "Reactivate"}
                </SubmitButton>
              </form>
              <form action={consoleSetTenantPackage}>
                <input type="hidden" name="tenantId" value={org.id} />
                <input type="hidden" name="package" value={next} />
                <SubmitButton variant="outline" pendingLabel="Saving…">
                  Set {planLabel(next)}
                </SubmitButton>
              </form>
              {org.adminId ? (
                <form action={consoleImpersonateTenant}>
                  <input type="hidden" name="userId" value={org.adminId} />
                  <SubmitButton pendingLabel="Switching…">Impersonate admin</SubmitButton>
                </form>
              ) : null}
            </div>
          </article>
          )
        })}
      </div>
    </div>
  )
}

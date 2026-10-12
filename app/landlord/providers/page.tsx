import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { submitProviderDecision } from "@/lib/actions"
import { providersForTenant } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Providers" }

export default async function ProvidersPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const providers = providersForTenant(user.tenantId)
  return (
    <div>
      <PageHeader
        kicker="Verified trades"
        title="Who you will assign"
        lede="Only verified providers whose service area matches one of your buildings are listed. They stay off assignment lists until you approve them."
      />
      {providers.length === 0 ? (
        <EmptyState title="No verified trades in your areas" body="When a verified electrician, plumber, courier, or cleaner covers one of your building areas, they show up here." />
      ) : (
        <div className="grid gap-3">
          {providers.map((provider) => (
            <article key={provider.id} className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 ring-1 ring-foreground/10">
              <div>
                <h2 className="font-sans text-lg font-extrabold">{provider.name}</h2>
                <p className="text-sm text-ink-soft">{provider.trade} · {provider.serviceArea} · {provider.email}</p>
              </div>
              <StatusBadge status={provider.approval === "none" ? "open" : provider.approval} />
              {provider.approval !== "approved" ? (
                <form action={submitProviderDecision}>
                  <input type="hidden" name="providerId" value={provider.id} />
                  <input type="hidden" name="status" value="approved" />
                  <SubmitButton pendingLabel="Approving…">Approve</SubmitButton>
                </form>
              ) : (
                <form action={submitProviderDecision}>
                  <input type="hidden" name="providerId" value={provider.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <SubmitButton variant="outline" pendingLabel="Updating…">Revoke</SubmitButton>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

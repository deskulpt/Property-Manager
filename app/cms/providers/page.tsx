import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { cmsProviders, landlordTenants } from "@/lib/db"
import { submitProviderVerify } from "@/lib/actions"
import { canListPersona, staffCapabilities } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"
import { ProviderApprovalForm } from "@/components/cms/provider-actions"

export const metadata = { title: "Providers" }

export default async function CmsProvidersPage() {
  const user = await getSessionUser()
  if (!user || !canListPersona(user.role, "providers")) {
    return <EmptyState title="Not in your desk" body="Service Managers and Super Admins manage the provider directory." />
  }
  const caps = staffCapabilities(user.role)!
  const providers = cmsProviders(user)
  const landlords = landlordTenants()
  return (
    <div>
      <PageHeader
        kicker="Personas"
        title="Service providers"
        lede="Verify the person, then approve them for a landlord whose buildings sit in their service area."
      />
      <div className="grid gap-4">
        {providers.map((provider) => (
          <article key={provider.id} className="grid gap-3 bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-sans text-xl font-extrabold">{provider.name}</h2>
                <p className="text-sm text-ink-soft">{provider.email}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">{provider.meta}</p>
              </div>
              <StatusBadge status={provider.providerVerified ? "verified" : "pending"} />
            </div>
            <ul className="text-sm text-ink-soft">
              {provider.approvals.length === 0 ? <li>No landlord approvals yet.</li> : null}
              {provider.approvals.map((item) => (
                <li key={item.tenantId}>
                  {item.tenantName}: <span className="font-mono uppercase tracking-wider text-[11px]">{item.status}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {caps.verifyProvider ? (
                <form action={submitProviderVerify}>
                  <input type="hidden" name="providerId" value={provider.id} />
                  <input type="hidden" name="verified" value={provider.providerVerified ? "0" : "1"} />
                  <SubmitButton variant="outline" pendingLabel="Saving…">
                    {provider.providerVerified ? "Clear verification" : "Mark verified"}
                  </SubmitButton>
                </form>
              ) : null}
              {caps.approveProvider && provider.providerVerified ? (
                <ProviderApprovalForm providerId={provider.id} landlords={landlords} />
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

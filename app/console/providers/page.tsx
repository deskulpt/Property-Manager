import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { ProviderApprovalForm } from "@/components/cms/provider-actions"
import { submitProviderVerify } from "@/lib/actions"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { cmsProviders, landlordTenants } from "@/lib/db"
import { staffCapabilities } from "@/lib/permissions"

export const metadata = { title: "Providers · Console" }

export default async function ConsoleProvidersPage() {
  const user = await requirePlatformAdmin()
  const caps = staffCapabilities(user.role)!
  const providers = cmsProviders(user)
  const landlords = landlordTenants()
  return (
    <div>
      <PageHeader
        kicker="Vetting"
        title="Service providers"
        lede="Verify trades, approve or clear landlord-area access, and keep geo-matched providers ready for jobs."
      />
      {providers.length === 0 ? (
        <EmptyState title="No providers" body="Seeded trades appear here after reset." />
      ) : null}
      <div className="grid gap-4">
        {providers.map((provider) => (
          <article key={provider.id} className="grid gap-3 border border-ink/10 bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-sans text-xl font-extrabold">{provider.name}</h2>
                <p className="text-sm text-ink-soft">{provider.email}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  {provider.meta}
                </p>
              </div>
              <StatusBadge status={provider.providerVerified ? "verified" : "pending"} />
            </div>
            <ul className="text-sm text-ink-soft">
              {provider.approvals.length === 0 ? <li>No landlord approvals yet.</li> : null}
              {provider.approvals.map((item) => (
                <li key={item.tenantId}>
                  {item.tenantName}:{" "}
                  <span className="font-mono text-[11px] uppercase tracking-wider">{item.status}</span>
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

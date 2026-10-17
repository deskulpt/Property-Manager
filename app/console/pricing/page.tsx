import Link from "next/link"
import { PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { consoleSetTenantPackage } from "@/lib/actions"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { platformLandlordDirectory } from "@/lib/db"

export const metadata = { title: "Pricing · Console" }

export default async function ConsolePricingPage() {
  await requirePlatformAdmin()
  const orgs = platformLandlordDirectory()
  return (
    <div>
      <PageHeader
        kicker="Entitlements"
        title="Pricing packages"
        lede="Assign Starter or Pro per landlord tenant. Public plan copy lives on /pricing."
      />
      <p className="mb-4 text-sm text-ink-soft">
        <Link href="/pricing" className="text-terra underline">
          View public pricing
        </Link>
      </p>
      <div className="grid gap-3">
        {orgs.map((org) => (
          <article
            key={org.id}
            className="flex flex-wrap items-center justify-between gap-3 border border-ink/10 bg-card p-4"
          >
            <div>
              <h2 className="font-sans text-lg font-extrabold">{org.name}</h2>
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                Current: {org.package} · {org.status}
              </p>
            </div>
            <form action={consoleSetTenantPackage}>
              <input type="hidden" name="tenantId" value={org.id} />
              <input type="hidden" name="package" value={org.package === "pro" ? "starter" : "pro"} />
              <SubmitButton variant="outline" pendingLabel="Saving…">
                Switch to {org.package === "pro" ? "Starter" : "Pro"}
              </SubmitButton>
            </form>
          </article>
        ))}
      </div>
    </div>
  )
}

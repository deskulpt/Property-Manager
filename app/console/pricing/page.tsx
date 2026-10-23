import Link from "next/link"
import { PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { consoleSetTenantPackage } from "@/lib/actions"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { platformLandlordDirectory } from "@/lib/db"
import { planLabel, type PlanId } from "@/lib/plans"

export const metadata = { title: "Pricing · Console" }

function nextSelfServePlan(current: PlanId): PlanId {
  if (current === "starter") return "growth"
  if (current === "growth") return "pro"
  return "starter"
}

export default async function ConsolePricingPage() {
  await requirePlatformAdmin()
  const orgs = platformLandlordDirectory()
  return (
    <div>
      <PageHeader
        kicker="Entitlements"
        title="Pricing packages"
        lede="Assign Basic / Growth / Pro per landlord tenant. Public copy lives at /pricing (proposed INR / property / year)."
      />
      <p className="mb-6 text-sm text-ink-soft">
        <Link href="/pricing" className="font-semibold text-terra hover:underline">
          Open public pricing
        </Link>
      </p>
      <div className="grid gap-3">
        {orgs.map((org) => {
          const next = nextSelfServePlan(org.package)
          return (
            <article
              key={org.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-ink/10 bg-card p-4"
            >
              <div>
                <h2 className="font-sans text-lg font-extrabold">{org.name}</h2>
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  Current: {planLabel(org.package)} · {org.status}
                </p>
              </div>
              <form action={consoleSetTenantPackage}>
                <input type="hidden" name="tenantId" value={org.id} />
                <input type="hidden" name="package" value={next} />
                <SubmitButton variant="outline" pendingLabel="Saving…">
                  Switch to {planLabel(next)}
                </SubmitButton>
              </form>
            </article>
          )
        })}
      </div>
    </div>
  )
}

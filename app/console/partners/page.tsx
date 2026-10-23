import Link from "next/link"
import { PageHeader } from "@/components/product"
import { requirePlatformAdmin } from "@/lib/console-gate"

export const metadata = { title: "Partners · Console" }

export default async function ConsolePartnersPage() {
  await requirePlatformAdmin()
  return (
    <div>
      <PageHeader
        kicker="§19C"
        title="Partner affiliates"
        lede="Vetting queue for affiliate and service partners. The partner-network store is not on main yet — use CMS providers for trade vetting today."
      />
      <div className="border border-ink/10 bg-card p-5">
        <p className="text-sm text-ink-soft">
          No partner applications on this deployment. When the partner network slice merges, rows
          appear here.
        </p>
        <p className="mt-3 text-sm">
          <Link href="/console/providers" className="font-semibold text-terra underline">
            Open provider vetting
          </Link>
          {" · "}
          <Link href="/cms/providers" className="underline">
            CMS providers
          </Link>
        </p>
      </div>
    </div>
  )
}

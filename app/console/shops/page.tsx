import { PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { consoleToggleShopSku } from "@/lib/actions"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { platformShopCatalog } from "@/lib/db"
import { money } from "@/lib/format"

export const metadata = { title: "Shops · Console" }

export default async function ConsoleShopsPage() {
  await requirePlatformAdmin()
  const skus = platformShopCatalog()
  return (
    <div>
      <PageHeader
        kicker="Catalog"
        title="Shops across tenants"
        lede="Enable or disable SKUs for any landlord shop. Prices stay in the tenant ledger currency (INR)."
      />
      <div className="grid gap-3">
        {skus.map((sku) => (
          <article
            key={sku.id}
            className="flex flex-wrap items-center justify-between gap-3 border border-ink/10 bg-card p-4"
          >
            <div>
              <h2 className="font-sans text-lg font-extrabold">{sku.name}</h2>
              <p className="text-sm text-ink-soft">
                {sku.tenantName} · {sku.kind} · {money(sku.priceCents)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={sku.enabled ? "verified" : "pending"} />
              <form action={consoleToggleShopSku}>
                <input type="hidden" name="tenantId" value={sku.tenantId} />
                <input type="hidden" name="skuId" value={sku.id} />
                <input type="hidden" name="enabled" value={sku.enabled ? "0" : "1"} />
                <SubmitButton variant="outline" pendingLabel="Saving…">
                  {sku.enabled ? "Disable" : "Enable"}
                </SubmitButton>
              </form>
            </div>
          </article>
        ))}
        {skus.length === 0 ? (
          <p className="text-sm text-ink-soft">No shop SKUs seeded yet.</p>
        ) : null}
      </div>
    </div>
  )
}

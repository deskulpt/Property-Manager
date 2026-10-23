import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { toggleShopSkuAction } from "@/lib/actions"
import {
  getShopSettingsPublic,
  listShopSkus,
  ordersForTenant,
} from "@/lib/db"
import { formatDay, money } from "@/lib/format"
import { getSessionUser } from "@/lib/session"
import { SubmitButton } from "@/components/submit-button"

export const metadata = { title: "Shop orders" }

export default async function LandlordShopPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null

  const settings = getShopSettingsPublic(user.tenantId)
  const skus = listShopSkus(user.tenantId)
  const orders = ordersForTenant(user.tenantId)

  return (
    <div>
      <PageHeader
        kicker="Commerce"
        title="Occupant shop"
        lede="SKUs and paid orders for your properties. Configure Razorpay under Settings → Payments."
      />

      <section className="mb-10 bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <h2 className="font-sans text-lg font-extrabold">Status</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Shop {settings.enabled ? "enabled" : "disabled"} ·{" "}
          {settings.demoMode ? "Demo mode on" : "Demo mode off"} ·{" "}
          {settings.hasSecret
            ? `Secret on file ${settings.secretLast4}`
            : "No Razorpay secret"}{" "}
          · Key ID {settings.keyId ?? "(none)"}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-sans text-lg font-extrabold">SKUs</h2>
        {skus.length === 0 ? (
          <EmptyState
            title="No SKUs"
            body="Seed catalogues ship with BBM. Other orgs can add SKUs in a later slice."
          />
        ) : (
          <div className="grid gap-3">
            {skus.map((sku) => (
              <article
                key={sku.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 ring-1 ring-foreground/10"
              >
                <div>
                  <p className="font-sans font-extrabold">{sku.name}</p>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                    {sku.kind} · {money(sku.priceCents)} ·{" "}
                    {sku.enabled ? "enabled" : "disabled"}
                  </p>
                </div>
                <form action={toggleShopSkuAction}>
                  <input type="hidden" name="skuId" value={sku.id} />
                  <input type="hidden" name="enabled" value={sku.enabled ? "0" : "1"} />
                  <SubmitButton className="h-9 border border-ink/20 px-3 text-sm">
                    {sku.enabled ? "Disable" : "Enable"}
                  </SubmitButton>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-sans text-lg font-extrabold">Orders</h2>
        {orders.length === 0 ? (
          <EmptyState
            title="No shop orders yet"
            body="When Devon (or another occupant) checks out, the paid order appears here."
          />
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => (
              <article key={order.id} className="bg-card p-4 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-sans font-extrabold">{order.userName}</p>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                      {formatDay(order.createdAt.slice(0, 10))} · {order.paymentProvider} ·{" "}
                      {order.paymentRef}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-2 font-bold">{money(order.amountCents)}</p>
                <ul className="mt-2 text-sm text-ink-soft">
                  {order.lines.map((line) => (
                    <li key={line.id}>
                      {line.skuName} × {line.qty}
                      {line.slotStart ? ` · ${line.slotStart}` : ""}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

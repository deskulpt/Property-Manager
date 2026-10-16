import Link from "next/link"
import { EmptyState, PageHeader, RoleGate, StatusBadge } from "@/components/product"
import { ShopCartPanel, ShopCatalogue } from "@/components/shop/shop-desk"
import {
  cartForUser,
  getShopSettingsPublic,
  leasesForOccupant,
  listShopSkus,
  ordersForOccupant,
} from "@/lib/db"
import { formatDay, money } from "@/lib/format"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Occupant shop" }

export default async function ShopPage() {
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-10">
        <RoleGate
          title="Occupant shop"
          body="Switch to Devon Hale (approved lease on BBM Unit A1) to shop. Maya has no lease yet."
        />
      </div>
    )
  }

  const leases = leasesForOccupant(user.id)
  if (leases.length === 0) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-10">
        <PageHeader
          kicker="Occupant only"
          title="Shop"
          lede="Property-tied commerce for current lessees."
        />
        <EmptyState
          title="Shop is for current occupants"
          body="You need an approved lease before Extra Keys, FOBs, filters, tool kits, or lift bookings appear."
          action={{ href: "/properties", label: "Browse buildings" }}
        />
      </div>
    )
  }

  const lease = leases[0]
  const settings = getShopSettingsPublic(lease.tenantId)
  const skus = settings.enabled
    ? listShopSkus(lease.tenantId, { enabledOnly: true, propertyId: lease.propertyId })
    : []
  const cart = cartForUser(user.id, lease.tenantId)
  const orders = ordersForOccupant(user.id)

  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <PageHeader
        kicker={`${lease.tenantName} · Unit ${lease.unitCode}`}
        title="Building shop"
        lede="Extra keys, FOBs, filters, tool-kit rentals, and service-lift slots. Cart stays on this landlord only."
      />
      <div className="mb-6 flex flex-wrap gap-3 text-sm font-bold">
        <Link href="/account" className="text-brand">
          Applications
        </Link>
        <Link href="/account/payments" className="text-brand">
          Payments
        </Link>
        <Link href="/inbox" className="text-brand">
          Inbox
        </Link>
      </div>

      {!settings.enabled ? (
        <EmptyState
          title="Shop disabled"
          body="Your landlord turned the shop off. Ask them in Settings → Payments."
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="mb-4 font-sans text-lg font-extrabold">Catalogue</h2>
            <ShopCatalogue tenantId={lease.tenantId} skus={skus} />
          </div>
          <ShopCartPanel
            tenantId={lease.tenantId}
            lines={cart}
            demoMode={settings.demoMode || !settings.hasSecret || !settings.keyId}
          />
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-4 font-sans text-lg font-extrabold">Your orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-ink-soft">No orders yet.</p>
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => (
              <article key={order.id} className="bg-card p-4 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                    {formatDay(order.createdAt.slice(0, 10))} · {order.paymentProvider}
                  </p>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-2 font-sans text-lg font-extrabold">{money(order.amountCents)}</p>
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

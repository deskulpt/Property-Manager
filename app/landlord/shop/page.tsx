import { PageHeader } from "@/components/product"
import { money } from "@/lib/format"
import { SEED_SHOP_SKUS } from "@/lib/shop/provider"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Shop admin" }

export default async function LandlordShopPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null

  return (
    <div>
      <PageHeader
        kicker="Occupant commerce"
        title="Shop (scaffold)"
        lede="Seed SKUs and Razorpay settings UI stub. Checkout uses demoShopPay until keys are configured. Secrets never return to the client."
      />
      <section className="mb-8 border border-ink/10 bg-card p-4">
        <h2 className="font-sans text-lg font-extrabold">Razorpay settings</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Demo mode on. Key Secret is never echoed to the browser in the live slice.
        </p>
        <form className="mt-4 grid max-w-md gap-3">
          <label className="grid gap-1 text-sm">
            Key ID
            <input disabled className="h-10 border border-ink/15 bg-paper-2 px-3" placeholder="rzp_test_…" />
          </label>
          <label className="grid gap-1 text-sm">
            Key Secret
            <input disabled type="password" className="h-10 border border-ink/15 bg-paper-2 px-3" placeholder="••••••••" />
          </label>
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            Scaffold — save disabled until Slice G wiring
          </p>
        </form>
      </section>
      <section className="border border-ink/10 bg-card p-4">
        <h2 className="font-sans text-lg font-extrabold">Catalogue (seed preview)</h2>
        <ul className="mt-3 grid gap-2">
          {SEED_SHOP_SKUS.map((sku) => (
            <li key={sku.id} className="flex justify-between gap-3 border-b border-ink/5 py-2 text-sm">
              <span>
                <span className="font-semibold">{sku.name}</span>
                <span className="text-ink-faint"> · {sku.kind}</span>
              </span>
              <span>{money(sku.priceInrCents)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

"use client"

import { useActionState } from "react"
import { addShopCartItem, checkoutShopCart, type ShopActionState } from "@/lib/actions"
import type { ShopCartLine, ShopSkuRecord } from "@/lib/db"
import { money } from "@/lib/format"
import { SubmitButton } from "@/components/submit-button"

const initial: ShopActionState = { error: null, message: null }

function AddForm({
  tenantId,
  sku,
}: {
  tenantId: string
  sku: ShopSkuRecord
}) {
  const [state, action] = useActionState(addShopCartItem, initial)
  return (
    <form action={action} className="mt-3 grid gap-2 border-t border-ink/10 pt-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="skuId" value={sku.id} />
      {sku.kind === "rental" ? (
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Slot (ISO local)</span>
          <input
            name="slotStart"
            type="datetime-local"
            required
            className="h-10 border border-ink/20 bg-card px-3"
          />
        </label>
      ) : (
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Qty</span>
          <input
            name="qty"
            type="number"
            min={1}
            max={20}
            defaultValue={1}
            className="h-10 w-24 border border-ink/20 bg-card px-3"
          />
        </label>
      )}
      <SubmitButton className="h-10 bg-brand px-4 text-sm font-semibold text-paper">
        Add to cart
      </SubmitButton>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-avail">{state.message}</p> : null}
    </form>
  )
}

export function ShopCatalogue({
  tenantId,
  skus,
}: {
  tenantId: string
  skus: ShopSkuRecord[]
}) {
  if (skus.length === 0) {
    return <p className="text-sm text-ink-soft">No SKUs enabled for this property.</p>
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {skus.map((sku) => (
        <article key={sku.id} className="bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-sans text-lg font-extrabold">{sku.name}</h3>
            <p className="font-mono text-sm font-bold">{money(sku.priceCents)}</p>
          </div>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            {sku.kind === "rental" ? "Rental booking" : "Purchase"}
          </p>
          <AddForm tenantId={tenantId} sku={sku} />
        </article>
      ))}
    </div>
  )
}

export function ShopCartPanel({
  tenantId,
  lines,
  demoMode,
}: {
  tenantId: string
  lines: ShopCartLine[]
  demoMode: boolean
}) {
  const [state, action] = useActionState(checkoutShopCart, initial)
  const total = lines.reduce((sum, line) => sum + line.lineCents, 0)

  return (
    <section className="bg-card p-4 ring-1 ring-foreground/10 md:p-6">
      <h2 className="font-sans text-lg font-extrabold">Cart</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {demoMode
          ? "Checkout uses the demo shop adapter — labelled Demo, no live Razorpay charge."
          : "Demo mode is off and keys are present — Razorpay stub path (still no live HTTP in this build)."}
      </p>
      {lines.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">Cart is empty.</p>
      ) : (
        <>
          <ul className="mt-4 grid gap-2">
            {lines.map((line) => (
              <li
                key={line.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/10 py-2 text-sm"
              >
                <span>
                  {line.name} × {line.qty}
                  {line.slotStart ? (
                    <span className="mt-1 block font-mono text-[11px] text-ink-faint">
                      Slot {line.slotStart}
                    </span>
                  ) : null}
                </span>
                <span className="font-bold">{money(line.lineCents)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-sans text-base font-extrabold">Total {money(total)}</p>
          <form action={action} className="mt-4 grid gap-3">
            <input type="hidden" name="tenantId" value={tenantId} />
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Note (optional)</span>
              <input name="note" className="h-10 border border-ink/20 bg-paper px-3" />
            </label>
            <SubmitButton className="h-10 bg-terra px-4 text-sm font-semibold text-paper">
              {demoMode ? "Pay with demo adapter" : "Pay (Razorpay stub)"}
            </SubmitButton>
          </form>
        </>
      )}
      {state.error ? <p className="mt-3 text-sm text-destructive">{state.error}</p> : null}
      {state.message ? (
        <p className="mt-3 border border-avail/40 bg-avail/10 px-3 py-2 text-sm" role="status">
          {state.message}
          {state.orderId ? ` · Order ${state.orderId.slice(0, 8)}` : ""}
        </p>
      ) : null}
    </section>
  )
}

"use client"

import { useActionState, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SubmitButton } from "@/components/submit-button"
import { useMarket } from "@/components/market/market-provider"
import { submitAutopay, submitMethod, submitPayment, type ApplyState } from "@/lib/actions"
import type { PaymentMethodKind } from "@/lib/market"

const initial: ApplyState = { error: null, fieldErrors: {} }

function last4Label(kind: PaymentMethodKind): string {
  if (kind === "upi") return "VPA last 4 characters"
  if (kind === "interac") return "Interac contact last 4"
  if (kind === "stripe_card" || kind === "card_demo") return "Card last 4 digits"
  return "Mandate last 4 digits"
}

function autopayLabel(marketId: string): string {
  return marketId === "CA"
    ? "Schedule Interac / card autopay on the demo adapter"
    : "Schedule eNACH / UPI autopay on the demo adapter"
}

export function MethodForm({
  tenants,
}: {
  tenants: { id: string; name: string }[]
}) {
  const [state, action] = useActionState(submitMethod, initial)
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "")
  const { market, marketId } = useMarket()
  const defaultKind = market.primaryPaymentMethods[0]?.kind ?? "upi"
  const [kind, setKind] = useState<PaymentMethodKind>(defaultKind)
  const [autopay, setAutopay] = useState(true)

  useEffect(() => {
    const next = market.primaryPaymentMethods[0]?.kind
    if (next) setKind(next)
  }, [marketId, market.primaryPaymentMethods])

  const items = tenants.map((tenant) => ({ value: tenant.id, label: tenant.name }))
  const methods = market.primaryPaymentMethods.map((item) => ({
    value: item.kind,
    label: item.label,
  }))
  const selected =
    market.primaryPaymentMethods.find((item) => item.kind === kind) ??
    market.primaryPaymentMethods[0]

  if (tenants.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        A payment method attaches after you apply to a landlord or hold a ledger with them.
      </p>
    )
  }

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="kind" value={selected?.kind ?? kind} />
      <input type="hidden" name="autopay" value={autopay ? "on" : ""} />
      <div className="grid gap-2">
        <Label>Landlord</Label>
        <Select items={items} value={tenantId} onValueChange={(value) => value && setTenantId(String(value))}>
          <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Method ({market.name})</Label>
        <Select
          items={methods}
          value={selected?.kind ?? kind}
          onValueChange={(value) => value && setKind(String(value) as PaymentMethodKind)}
        >
          <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            {methods.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected ? <p className="text-xs text-ink-soft">{selected.hint}</p> : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="last4">{last4Label(selected?.kind ?? kind)}</Label>
        <Input
          id="last4"
          name="last4"
          inputMode="numeric"
          maxLength={4}
          placeholder="4821"
          aria-invalid={Boolean(state.fieldErrors.last4)}
        />
        {state.fieldErrors.last4 ? <p className="text-sm text-destructive">{state.fieldErrors.last4}</p> : null}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={autopay} onCheckedChange={(checked) => setAutopay(checked === true)} />
        {autopayLabel(marketId)}
      </label>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit">Save demo method</Button>
    </form>
  )
}

export function AutopayForm({ tenantId, enabled }: { tenantId: string; enabled: boolean }) {
  return (
    <form action={submitAutopay} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="autopay" value="on" defaultChecked={enabled} className="size-4 accent-brand" />
        Autopay with the demo adapter
      </label>
      <SubmitButton variant="outline" pendingLabel="Updating…">Update autopay</SubmitButton>
    </form>
  )
}

export function PayForm({ tenantId }: { tenantId: string }) {
  const { marketId } = useMarket()
  return (
    <form action={submitPayment}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <SubmitButton pendingLabel="Posting…">
        {marketId === "CA"
          ? "Record demo Interac / Stripe payment"
          : "Record demo UPI / eNACH payment"}
      </SubmitButton>
    </form>
  )
}

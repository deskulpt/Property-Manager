"use client"

import { useActionState, useState } from "react"
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
import { submitAutopay, submitMethod, submitPayment, type ApplyState } from "@/lib/actions"

const initial: ApplyState = { error: null, fieldErrors: {} }

export function MethodForm({
  tenants,
}: {
  tenants: { id: string; name: string }[]
}) {
  const [state, action] = useActionState(submitMethod, initial)
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "")
  const [autopay, setAutopay] = useState(true)
  const items = tenants.map((tenant) => ({ value: tenant.id, label: tenant.name }))

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
        <Label htmlFor="last4">Last 4 digits</Label>
        <Input id="last4" name="last4" inputMode="numeric" maxLength={4} placeholder="4821" aria-invalid={Boolean(state.fieldErrors.last4)} />
        <p className="text-xs text-ink-soft">Demo only. Enter any 4 digits. No card number is stored and nothing is charged.</p>
        {state.fieldErrors.last4 ? <p className="text-sm text-destructive">{state.fieldErrors.last4}</p> : null}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={autopay} onCheckedChange={(checked) => setAutopay(checked === true)} />
        Schedule autopay on the demo adapter
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
  return (
    <form action={submitPayment}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <SubmitButton pendingLabel="Posting…">Record demo payment for open items</SubmitButton>
    </form>
  )
}

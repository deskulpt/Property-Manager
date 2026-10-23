"use client"

import { useActionState } from "react"
import { submitTicket, type ApplyState } from "@/lib/actions"
import { statusLabel, type TicketCategory } from "@/lib/format"
import { SubmitButton } from "@/components/submit-button"

const initial: ApplyState = { error: null, fieldErrors: {} }

const CATEGORIES: TicketCategory[] = ["maintenance", "billing", "noise", "access", "other"]

export function TicketForm({
  leases,
}: {
  leases: { id: string; unitCode: string; propertyName: string }[]
}) {
  const [state, action] = useActionState(submitTicket, initial)
  return (
    <form action={action} className="grid gap-3 bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="font-heading text-lg font-extrabold">File a ticket</h2>
      <label className="grid gap-1 text-sm">
        Lease
        <select name="leaseId" required className="h-9 border border-input bg-background px-2" defaultValue={leases[0]?.id}>
          {leases.map((lease) => (
            <option key={lease.id} value={lease.id}>
              Unit {lease.unitCode} · {lease.propertyName}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Category
        <select name="category" required className="h-9 border border-input bg-background px-2" defaultValue="maintenance">
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {statusLabel(category)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Subject
        <input name="subject" required minLength={3} className="h-9 border border-input bg-background px-2" placeholder="Short title" />
      </label>
      <label className="grid gap-1 text-sm">
        Details
        <textarea name="body" required minLength={5} rows={3} className="border border-input bg-background px-2 py-2" placeholder="What needs attention?" />
      </label>
      <label className="grid gap-1 text-sm">
        Photo name (optional demo)
        <input name="photoName" className="h-9 border border-input bg-background px-2" placeholder="dock-grinding.jpg" />
      </label>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton pendingLabel="Filing…">Submit ticket</SubmitButton>
    </form>
  )
}

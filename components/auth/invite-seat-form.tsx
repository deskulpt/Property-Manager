"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/submit-button"
import { inviteSeatAction, type AuthFormState } from "@/lib/actions"

const initial: AuthFormState = { error: null, message: null, fieldErrors: {} }

export function InviteSeatForm() {
  const [state, action] = useActionState(inviteSeatAction, initial)
  return (
    <form action={action} className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end" data-testid="invite-seat-form">
      <div className="grid gap-2">
        <Label htmlFor="email">Teammate email</Label>
        <Input id="email" name="email" type="email" required placeholder="leasing@example.com" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="seatRole">Seat role</Label>
        <select
          id="seatRole"
          name="seatRole"
          defaultValue="leasing_manager"
          className="h-9 rounded-sm border border-ink/20 bg-card px-2 font-mono text-[12px]"
        >
          <option value="leasing_manager">Leasing manager</option>
          <option value="accountant">Accountant</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
      <SubmitButton pendingLabel="Inviting…">Send invite</SubmitButton>
      {state.error ? (
        <p className="text-sm text-destructive md:col-span-3">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-ink-soft md:col-span-3" data-testid="invite-success">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}

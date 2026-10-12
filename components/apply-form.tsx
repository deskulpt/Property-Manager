"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SubmitButton } from "@/components/submit-button"
import { submitApplication, type ApplyState } from "@/lib/actions"

const initial: ApplyState = { error: null, fieldErrors: {} }

export function ApplyForm({
  unitId,
  defaults,
}: {
  unitId: string
  defaults: { company: string; contactName: string; email: string }
}) {
  const [state, action] = useActionState(submitApplication, initial)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="unitId" value={unitId} />
      {(
        [
          ["company", "Company", defaults.company],
          ["contactName", "Contact name", defaults.contactName],
          ["email", "Work email", defaults.email],
        ] as const
      ).map(([name, label, value]) => (
        <div key={name} className="grid gap-2">
          <Label htmlFor={name}>{label}</Label>
          <Input id={name} name={name} defaultValue={value} aria-invalid={Boolean(state.fieldErrors[name])} />
          {state.fieldErrors[name] ? <p className="text-sm text-destructive">{state.fieldErrors[name]}</p> : null}
        </div>
      ))}
      <div className="grid gap-2">
        <Label htmlFor="intendedUse">Intended use</Label>
        <Input id="intendedUse" name="intendedUse" placeholder="Cross-dock and light assembly" aria-invalid={Boolean(state.fieldErrors.intendedUse)} />
        {state.fieldErrors.intendedUse ? <p className="text-sm text-destructive">{state.fieldErrors.intendedUse}</p> : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" placeholder="Trailer count, timing, power needs." />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton pendingLabel="Sending…">Submit application</SubmitButton>
    </form>
  )
}

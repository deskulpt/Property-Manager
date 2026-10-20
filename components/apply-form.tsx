"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SubmitButton } from "@/components/submit-button"
import { submitApplication, type ApplyState } from "@/lib/actions"
import type { PropertySegment } from "@/lib/listing-schemas"

const initial: ApplyState = { error: null, fieldErrors: {} }

export function ApplyForm({
  unitId,
  segment,
  defaults,
}: {
  unitId: string
  segment: PropertySegment
  defaults: { company: string; contactName: string; email: string }
}) {
  const [state, action] = useActionState(submitApplication, initial)
  const residential = segment === "residential"
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="unitId" value={unitId} />
      <input type="hidden" name="segment" value={segment} />
      {(
        [
          [
            "company",
            residential ? "Household / applicant name" : "Company / brand",
            residential ? defaults.contactName || defaults.company : defaults.company,
          ],
          ["contactName", "Contact name", defaults.contactName],
          ["email", residential ? "Email" : "Work email", defaults.email],
        ] as const
      ).map(([name, label, value]) => (
        <div key={name} className="grid gap-2">
          <Label htmlFor={name}>{label}</Label>
          <Input id={name} name={name} defaultValue={value} aria-invalid={Boolean(state.fieldErrors[name])} />
          {state.fieldErrors[name] ? <p className="text-sm text-destructive">{state.fieldErrors[name]}</p> : null}
        </div>
      ))}
      <div className="grid gap-2">
        <Label htmlFor="intendedUse">{residential ? "Occupancy notes" : "Intended use"}</Label>
        <Input
          id="intendedUse"
          name="intendedUse"
          placeholder={
            residential
              ? "Family of 3 · move-in next month"
              : segment === "commercial"
                ? "Retail apparel · 3-year term"
                : "Cross-dock and light assembly"
          }
          aria-invalid={Boolean(state.fieldErrors.intendedUse)}
        />
        {state.fieldErrors.intendedUse ? (
          <p className="text-sm text-destructive">{state.fieldErrors.intendedUse}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder={
            residential
              ? "Employer, preferred lease start, pets."
              : "Trailer count, timing, power needs."
          }
        />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton pendingLabel="Sending…">Submit application</SubmitButton>
    </form>
  )
}

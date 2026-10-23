"use client"

import { useActionState, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SubmitButton } from "@/components/submit-button"
import { submitVisitRequest, type VisitBookState } from "@/lib/actions"
import type { AppointmentTypeRecord, VisitSlot } from "@/lib/visit-types"

const initial: VisitBookState = { error: null, fieldErrors: {} }

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Slot-picker booking form for `/properties/[slug]/book` (calendar residual). */
export function BookSlotForm({
  propertyId,
  unitId,
  types,
  slotsByType,
  defaults,
}: {
  propertyId: string
  unitId?: string | null
  types: AppointmentTypeRecord[]
  slotsByType: Record<string, VisitSlot[]>
  defaults: { guestName: string; guestEmail: string; guestPhone: string }
}) {
  const [state, action] = useActionState(submitVisitRequest, initial)
  const [typeId, setTypeId] = useState(types[0]?.id ?? "")
  const [startsAt, setStartsAt] = useState("")
  const selected = types.find((t) => t.id === typeId) ?? types[0]
  const slots = useMemo(() => slotsByType[typeId] ?? [], [slotsByType, typeId])

  if (types.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        This landlord has not configured visit types yet.
      </p>
    )
  }

  return (
    <form action={action} className="grid gap-5" data-testid="book-visit-form">
      <input type="hidden" name="propertyId" value={propertyId} />
      {unitId ? <input type="hidden" name="unitId" value={unitId} /> : null}
      <input type="hidden" name="appointmentTypeId" value={typeId} />
      <input type="hidden" name="startsAt" value={startsAt} />

      <fieldset className="grid gap-2">
        <legend className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
          Visit type
        </legend>
        <div className="flex flex-wrap gap-2">
          {types.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => {
                setTypeId(type.id)
                setStartsAt("")
              }}
              className={`border px-3 py-2 font-serif text-sm font-bold transition-colors ${
                typeId === type.id
                  ? "border-terra bg-terra text-white"
                  : "border-ink/15 bg-card hover:border-terra/50"
              }`}
              data-testid={`visit-type-${type.code}`}
            >
              {type.name}
              <span className="ml-2 font-mono text-[10px] font-normal uppercase tracking-wider opacity-80">
                {type.durationMinutes} min
              </span>
            </button>
          ))}
        </div>
        {selected?.requiresMeetingUrl ? (
          <p className="text-sm text-ink-soft">
            Virtual tours need a Meet, Zoom, or Matterport show URL so the host can join.
          </p>
        ) : null}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
          Open slots (IST)
        </legend>
        {slots.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No open slots in the next two weeks for this type. Try another type or check back after the
            landlord posts hours.
          </p>
        ) : (
          <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
            {slots.map((slot) => (
              <button
                key={slot.startsAt}
                type="button"
                onClick={() => setStartsAt(slot.startsAt)}
                className={`border px-3 py-2 text-left text-sm transition-colors ${
                  startsAt === slot.startsAt
                    ? "border-brand bg-brand text-paper"
                    : "border-ink/10 bg-card hover:border-brand/40"
                }`}
                data-testid={`visit-slot-${slot.startsAt}`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        )}
        {!startsAt && slots.length > 0 ? (
          <p className="text-sm text-destructive">Select a slot to continue.</p>
        ) : null}
      </fieldset>

      {(
        [
          ["guestName", "Your name", defaults.guestName],
          ["guestEmail", "Email", defaults.guestEmail],
          ["guestPhone", "Mobile", defaults.guestPhone],
        ] as const
      ).map(([name, label, value]) => (
        <div key={name} className="grid gap-2">
          <Label htmlFor={name}>{label}</Label>
          <Input
            id={name}
            name={name}
            defaultValue={value}
            aria-invalid={Boolean(state.fieldErrors[name])}
            placeholder={name === "guestPhone" ? "+919876543210" : undefined}
          />
          {state.fieldErrors[name] ? (
            <p className="text-sm text-destructive">{state.fieldErrors[name]}</p>
          ) : null}
        </div>
      ))}

      {selected?.requiresMeetingUrl ? (
        <div className="grid gap-2">
          <Label htmlFor="meetingUrl">Meeting / walkthrough URL</Label>
          <Input
            id="meetingUrl"
            name="meetingUrl"
            placeholder="https://meet.google.com/… or Matterport show URL"
            aria-invalid={Boolean(state.fieldErrors.meetingUrl)}
          />
          {state.fieldErrors.meetingUrl ? (
            <p className="text-sm text-destructive">{state.fieldErrors.meetingUrl}</p>
          ) : null}
        </div>
      ) : (
        <input type="hidden" name="meetingUrl" value="" />
      )}

      <div className="grid gap-2">
        <Label htmlFor="notes">Note (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Which bay, trailer count, accessibility needs."
        />
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {startsAt && slots.length > 0 ? (
        <SubmitButton pendingLabel="Requesting…">Request visit</SubmitButton>
      ) : (
        <p className="text-sm text-ink-soft">Select a slot before requesting.</p>
      )}
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        Windows use {WEEKDAYS.join(" · ")} desk hours in Asia/Kolkata. Double-booked slots are
        rejected.
      </p>
    </form>
  )
}

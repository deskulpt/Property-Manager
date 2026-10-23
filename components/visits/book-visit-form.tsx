"use client"

import { useActionState } from "react"
import { requestVisit, type VisitFormState } from "@/lib/actions"
import { SubmitButton } from "@/components/submit-button"

const initial: VisitFormState = {}

export function BookVisitForm({
  unitId,
  unitCode,
  propertyName,
}: {
  unitId: string
  unitCode: string
  propertyName: string
}) {
  const [state, action] = useActionState(requestVisit, initial)

  if (state.ok) {
    return (
      <div className="border border-avail/40 bg-avail/10 px-4 py-3 text-sm text-ink">
        Visit requested for Unit {unitCode}. The landlord inbox gets a demo notification.
      </div>
    )
  }

  return (
    <form action={action} className="grid gap-3 border border-white/20 bg-white/5 p-4">
      <input type="hidden" name="unitId" value={unitId} />
      <p className="font-mono text-[11px] uppercase tracking-wider text-white/55">
        Book a visit · {propertyName} · Unit {unitCode}
      </p>
      {state.error ? <p className="text-sm text-[#f0b4a8]">{state.error}</p> : null}
      <label className="grid gap-1 text-sm">
        <span className="text-white/70">Name</span>
        <input
          name="name"
          required
          className="border border-white/25 bg-brand-deep px-3 py-2 text-paper"
          autoComplete="name"
        />
        {state.fieldErrors?.name ? (
          <span className="text-xs text-[#f0b4a8]">{state.fieldErrors.name}</span>
        ) : null}
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-white/70">Email</span>
        <input
          name="email"
          type="email"
          required
          className="border border-white/25 bg-brand-deep px-3 py-2 text-paper"
          autoComplete="email"
        />
        {state.fieldErrors?.email ? (
          <span className="text-xs text-[#f0b4a8]">{state.fieldErrors.email}</span>
        ) : null}
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-white/70">Phone (+91…)</span>
        <input
          name="phone"
          required
          className="border border-white/25 bg-brand-deep px-3 py-2 text-paper"
          autoComplete="tel"
          placeholder="+9198…"
        />
        {state.fieldErrors?.phone ? (
          <span className="text-xs text-[#f0b4a8]">{state.fieldErrors.phone}</span>
        ) : null}
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-white/70">Visit type</span>
        <select
          name="visitType"
          defaultValue="in_person"
          className="border border-white/25 bg-brand-deep px-3 py-2 text-paper"
        >
          <option value="in_person">In-person tour</option>
          <option value="virtual">Virtual tour</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-white/70">Preferred time (optional)</span>
        <input
          name="preferredAt"
          type="datetime-local"
          className="border border-white/25 bg-brand-deep px-3 py-2 text-paper"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-white/70">Note</span>
        <textarea
          name="note"
          rows={2}
          className="border border-white/25 bg-brand-deep px-3 py-2 text-paper"
          placeholder="Gate contact, group size…"
        />
      </label>
      <SubmitButton className="bg-terra px-4 py-3 font-serif text-sm font-bold text-white hover:bg-terra-dark">
        Request visit
      </SubmitButton>
    </form>
  )
}

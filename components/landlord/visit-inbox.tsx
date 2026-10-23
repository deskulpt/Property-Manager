"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { EmptyState, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  addAvailabilityWindow,
  removeAvailabilityWindow,
  rescheduleVisit,
  reviewVisit,
  togglePropertyVisits,
} from "@/lib/actions"
import type {
  AppointmentRecord,
  AvailabilityWindowRecord,
  VisitPropertySummary,
  VisitSlot,
} from "@/lib/visit-types"

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function slotLabel(isoStart: string, isoEnd: string) {
  const start = new Date(isoStart)
  const end = new Date(isoEnd)
  const day = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(start)
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  })
  return `${day} · ${time.format(start)}–${time.format(end)} IST`
}

function RescheduleForm({
  appointment,
  slots,
}: {
  appointment: AppointmentRecord
  slots: VisitSlot[]
}) {
  const [startsAt, setStartsAt] = useState("")
  if (slots.length === 0) {
    return <p className="text-sm text-ink-soft">No alternate open slots right now.</p>
  }
  return (
    <form action={rescheduleVisit} className="grid gap-2 border border-ink/10 bg-paper/40 p-3">
      <input type="hidden" name="appointmentId" value={appointment.id} />
      <input type="hidden" name="startsAt" value={startsAt} />
      {appointment.typeCode === "virtual" ? (
        <div className="grid gap-1">
          <Label htmlFor={`meet-${appointment.id}`}>Meeting URL</Label>
          <Input
            id={`meet-${appointment.id}`}
            name="meetingUrl"
            defaultValue={appointment.meetingUrl ?? ""}
            placeholder="https://"
          />
        </div>
      ) : (
        <input type="hidden" name="meetingUrl" value="" />
      )}
      <Label>Propose a new slot</Label>
      <select
        className="border border-ink/15 bg-card px-2 py-2 text-sm"
        value={startsAt}
        onChange={(e) => setStartsAt(e.target.value)}
        required
      >
        <option value="">Choose…</option>
        {slots.map((slot) => (
          <option key={slot.startsAt} value={slot.startsAt}>
            {slot.label}
          </option>
        ))}
      </select>
      {startsAt ? (
        <SubmitButton pendingLabel="Rescheduling…" variant="outline">
          Reschedule
        </SubmitButton>
      ) : (
        <p className="text-sm text-ink-soft">Choose a slot to reschedule.</p>
      )}
    </form>
  )
}

export function VisitInbox({
  appointments,
  properties,
  windows,
  openSlotsByAppointment,
}: {
  appointments: AppointmentRecord[]
  properties: VisitPropertySummary[]
  windows: AvailabilityWindowRecord[]
  openSlotsByAppointment: Record<string, VisitSlot[]>
}) {
  const windowsByProperty = useMemo(() => {
    const map = new Map<string, AvailabilityWindowRecord[]>()
    for (const window of windows) {
      const list = map.get(window.propertyId) ?? []
      list.push(window)
      map.set(window.propertyId, list)
    }
    return map
  }, [windows])

  return (
    <div className="grid gap-10">
      <section className="grid gap-4">
        <h2 className="font-serif text-2xl font-semibold">Appointment inbox</h2>
        {appointments.length === 0 ? (
          <EmptyState
            title="No visits yet"
            body="Requests from the public Book a visit flow land here. Harbourline never sees BBM appointments."
          />
        ) : (
          <div className="grid gap-4">
            {appointments.map((appointment) => (
              <article
                key={appointment.id}
                className="grid gap-3 bg-card p-4 ring-1 ring-foreground/10"
                data-testid={`visit-${appointment.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-sans text-xl font-extrabold">{appointment.guestName}</h3>
                    <p className="text-sm text-ink-soft">
                      {appointment.guestEmail} · {appointment.guestPhone}
                    </p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>
                <p className="text-sm">
                  {appointment.typeName}
                  {appointment.unitCode ? ` · Unit ${appointment.unitCode}` : ""} at{" "}
                  {appointment.propertyName}
                </p>
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  {slotLabel(appointment.startsAt, appointment.endsAt)}
                </p>
                {appointment.meetingUrl ? (
                  <p className="text-sm">
                    Virtual URL:{" "}
                    <a href={appointment.meetingUrl} className="text-brand underline break-all">
                      {appointment.meetingUrl}
                    </a>
                  </p>
                ) : null}
                {appointment.notes ? <p className="text-sm text-ink-soft">{appointment.notes}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/properties/${appointment.propertySlug}`}
                    className="font-sans text-sm font-bold text-brand underline"
                  >
                    Open property
                  </Link>
                  {appointment.status === "requested" ? (
                    <>
                      <form action={reviewVisit} data-testid={`confirm-form-${appointment.id}`}>
                        <input type="hidden" name="appointmentId" value={appointment.id} />
                        <input type="hidden" name="decision" value="confirmed" />
                        <SubmitButton data-testid={`confirm-${appointment.id}`} pendingLabel="Confirming…">
                          Confirm
                        </SubmitButton>
                      </form>
                      <form action={reviewVisit}>
                        <input type="hidden" name="appointmentId" value={appointment.id} />
                        <input type="hidden" name="decision" value="declined" />
                        <SubmitButton variant="outline" pendingLabel="Declining…">
                          Decline
                        </SubmitButton>
                      </form>
                    </>
                  ) : null}
                  {appointment.status === "confirmed" ? (
                    <>
                      <form action={reviewVisit}>
                        <input type="hidden" name="appointmentId" value={appointment.id} />
                        <input type="hidden" name="decision" value="completed" />
                        <SubmitButton pendingLabel="Saving…">Mark completed</SubmitButton>
                      </form>
                      <form action={reviewVisit}>
                        <input type="hidden" name="appointmentId" value={appointment.id} />
                        <input type="hidden" name="decision" value="no_show" />
                        <SubmitButton variant="outline" pendingLabel="Saving…">
                          No-show
                        </SubmitButton>
                      </form>
                      <form action={reviewVisit}>
                        <input type="hidden" name="appointmentId" value={appointment.id} />
                        <input type="hidden" name="decision" value="cancelled" />
                        <SubmitButton variant="outline" pendingLabel="Cancelling…">
                          Cancel
                        </SubmitButton>
                      </form>
                    </>
                  ) : null}
                </div>
                {appointment.status === "requested" || appointment.status === "confirmed" ? (
                  <RescheduleForm
                    appointment={appointment}
                    slots={openSlotsByAppointment[appointment.id] ?? []}
                  />
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4">
        <h2 className="font-serif text-2xl font-semibold">Availability</h2>
        <p className="text-sm text-ink-soft">
          Weekly windows per property in Asia/Kolkata. Public slot pickers subtract requested and confirmed visits.
        </p>
        <div className="grid gap-4">
          {properties.map((property) => {
            const propertyWindows = windowsByProperty.get(property.id) ?? []
            return (
              <article key={property.id} className="grid gap-3 bg-card p-4 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-sans text-lg font-extrabold">{property.name}</h3>
                    <p className="text-sm text-ink-soft">{property.area}</p>
                  </div>
                  <form action={togglePropertyVisits} className="flex items-center gap-2">
                    <input type="hidden" name="propertyId" value={property.id} />
                    <input type="hidden" name="enabled" value={property.visitsEnabled ? "0" : "1"} />
                    <SubmitButton variant="outline" pendingLabel="Saving…">
                      {property.visitsEnabled ? "Disable visits" : "Enable visits"}
                    </SubmitButton>
                  </form>
                </div>
                {propertyWindows.length === 0 ? (
                  <p className="text-sm text-ink-soft">No windows yet — add one below.</p>
                ) : (
                  <ul className="grid gap-2">
                    {propertyWindows.map((window) => (
                      <li
                        key={window.id}
                        className="flex flex-wrap items-center justify-between gap-2 border border-ink/10 px-3 py-2 text-sm"
                      >
                        <span>
                          {WEEKDAY_LABELS[window.weekday]} · {window.startTime}–{window.endTime}{" "}
                          {window.timezone}
                        </span>
                        <form action={removeAvailabilityWindow}>
                          <input type="hidden" name="windowId" value={window.id} />
                          <SubmitButton variant="outline" pendingLabel="Removing…">
                            Remove
                          </SubmitButton>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <form action={addAvailabilityWindow} className="grid gap-2 border border-dashed border-ink/20 p-3 sm:grid-cols-4">
                  <input type="hidden" name="propertyId" value={property.id} />
                  <div className="grid gap-1">
                    <Label>Weekday</Label>
                    <select name="weekday" className="border border-ink/15 bg-card px-2 py-2 text-sm" defaultValue="1">
                      {WEEKDAY_LABELS.map((label, index) => (
                        <option key={label} value={index}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`start-${property.id}`}>Start</Label>
                    <Input id={`start-${property.id}`} name="startTime" defaultValue="10:00" pattern="\d{2}:\d{2}" />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`end-${property.id}`}>End</Label>
                    <Input id={`end-${property.id}`} name="endTime" defaultValue="12:00" pattern="\d{2}:\d{2}" />
                  </div>
                  <div className="flex items-end">
                    <SubmitButton pendingLabel="Adding…">Add window</SubmitButton>
                  </div>
                </form>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

"use client"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** Minimal week grid — expand when visit booking leaves the unit-page form. */
export function VisitCalendarStub() {
  const slots = [
    { day: "Mon", time: "10:00", label: "Open", status: "free" },
    { day: "Mon", time: "14:00", label: "Requested · B1", status: "requested" },
    { day: "Wed", time: "11:30", label: "Open", status: "free" },
    { day: "Thu", time: "16:00", label: "Confirmed · A2", status: "confirmed" },
    { day: "Fri", time: "09:30", label: "Open", status: "free" },
  ]

  return (
    <div className="border border-ink/10 bg-card p-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-sans text-lg font-extrabold">Visit calendar</h2>
          <p className="text-sm text-ink-soft">
            Scaffold week view. Unit-page Book a visit form already enqueues notices — this board will
            approve / decline / reschedule next.
          </p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Demo week</p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-2 grid gap-2">
        {slots.map((slot) => (
          <div
            key={`${slot.day}-${slot.time}`}
            className={`flex flex-wrap items-center justify-between gap-2 border px-3 py-2 text-sm ${
              slot.status === "confirmed"
                ? "border-avail/40 bg-avail/10"
                : slot.status === "requested"
                  ? "border-pending/40 bg-pending/10"
                  : "border-ink/10 bg-paper-2"
            }`}
          >
            <span className="font-semibold">
              {slot.day} · {slot.time}
            </span>
            <span>{slot.label}</span>
            <div className="flex gap-2">
              <button type="button" disabled className="text-xs font-semibold text-terra opacity-50">
                Approve
              </button>
              <button type="button" disabled className="text-xs opacity-50">
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { beforeEach, describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"

installTempDatabase()

async function db() {
  return import("@/lib/db")
}

describe("Slice F visit booking", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
  })

  it("BBM has a seeded visit request; Harbourline inbox is empty", async () => {
    const { appointmentsForTenant } = await import("@/lib/visits")
    const bbm = appointmentsForTenant("t_bbm")
    const harbour = appointmentsForTenant("t_harbour")
    expect(bbm.some((a) => a.id === "appt_maya_waterman" && a.status === "requested")).toBe(true)
    expect(harbour).toHaveLength(0)
  })

  it("Harbourline cannot load a BBM appointment", async () => {
    const { appointmentForTenant } = await import("@/lib/visits")
    expect(appointmentForTenant("t_harbour", "appt_maya_waterman")).toBeNull()
    expect(appointmentForTenant("t_bbm", "appt_maya_waterman")?.guestName).toBe("Maya Chen")
  })

  it("rejects double-booking the same property slot", async () => {
    const { listOpenSlots, requestAppointment } = await import("@/lib/visits")
    const slots = listOpenSlots("p_waterman", "atype_bbm_inperson")
    expect(slots.length).toBeGreaterThan(0)
    const slot = slots[0]!
    const first = requestAppointment({
      propertyId: "p_waterman",
      unitId: "u_waterman_b1",
      appointmentTypeId: "atype_bbm_inperson",
      startsAt: slot.startsAt,
      guestName: "First Guest",
      guestEmail: "first@example.com",
      guestPhone: "+919876500001",
    })
    expect(first.ok).toBe(true)
    const second = requestAppointment({
      propertyId: "p_waterman",
      unitId: "u_waterman_a2",
      appointmentTypeId: "atype_bbm_inperson",
      startsAt: slot.startsAt,
      guestName: "Second Guest",
      guestEmail: "second@example.com",
      guestPhone: "+919876500002",
    })
    expect(second.ok).toBe(false)
  })

  it("confirm → completed path and decline from requested", async () => {
    const { transitionAppointment, appointmentForTenant } = await import("@/lib/visits")
    const confirmed = transitionAppointment("t_bbm", "appt_maya_waterman", "confirmed")
    expect(confirmed.ok).toBe(true)
    expect(appointmentForTenant("t_bbm", "appt_maya_waterman")?.status).toBe("confirmed")

    const tooEarly = transitionAppointment("t_bbm", "appt_maya_waterman", "completed")
    expect(tooEarly.ok).toBe(false)
  })

  it("visit reminder is idempotent via source_id", async () => {
    const { getDb } = await db()
    const { enqueueVisitReminders } = await import("@/lib/visits")

    const startsAt = new Date(Date.now() + 24 * 3_600_000).toISOString()
    const endsAt = new Date(Date.now() + 24 * 3_600_000 + 30 * 60_000).toISOString()
    getDb()
      .prepare(
        `INSERT INTO appointments (
          id, tenant_id, property_id, unit_id, appointment_type_id, status,
          starts_at, ends_at, guest_name, guest_email, guest_phone, notes,
          meeting_url, applicant_id, replaces_id, created_at, updated_at
        ) VALUES (?, 't_bbm', 'p_waterman', 'u_waterman_a2', 'atype_bbm_inperson', 'confirmed',
          ?, ?, 'Reminder Guest', 'remind@example.com', '+919876509999', '',
          NULL, 'u_maya', NULL, ?, ?)`,
      )
      .run(
        "appt_remind_test",
        startsAt,
        endsAt,
        new Date().toISOString(),
        new Date().toISOString(),
      )

    const first = enqueueVisitReminders(new Date())
    const second = enqueueVisitReminders(new Date())
    expect(first).toBeGreaterThanOrEqual(1)
    expect(second).toBe(0)

    const remindRows = getDb()
      .prepare(
        "SELECT COUNT(*) AS c FROM notifications WHERE source_id LIKE 'visit_remind:appt_remind_test%'",
      )
      .get() as { c: number }
    expect(Number(remindRows.c)).toBeGreaterThan(0)
  })

  it("propertyForLandlord exposes visitsEnabled", async () => {
    const { propertyForLandlord } = await db()
    const property = propertyForLandlord("t_bbm", "p_waterman")
    expect(property?.visitsEnabled).toBe(true)
  })
})

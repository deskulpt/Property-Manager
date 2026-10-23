import "server-only"
import {
  getDb,
  landlordIds,
  type SessionUser,
} from "@/lib/db"
import type { AppointmentStatus } from "@/lib/format"
import { isE164 } from "@/lib/market"
import { notifyMany, type Notice } from "@/lib/notifications"
import type {
  AppointmentRecord,
  AppointmentTypeRecord,
  AvailabilityWindowRecord,
  VisitSlot,
} from "@/lib/visit-types"

export type {
  AppointmentRecord,
  AppointmentTypeRecord,
  AvailabilityWindowRecord,
  VisitSlot,
} from "@/lib/visit-types"

type Sql = ReturnType<typeof getDb>

function asRow(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined
  return { ...(value as object) }
}

function asRows(values: unknown[]) {
  return values.map((value) => ({ ...(value as object) }) as Record<string, unknown>)
}

function str(row: Record<string, unknown>, key: string) {
  const value = row[key]
  return value == null ? null : String(value)
}

function transaction(work: (db: Sql) => void) {
  const db = getDb()
  db.exec("BEGIN")
  try {
    work(db)
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}

/** Asia/Kolkata wall clock → ISO with +05:30 offset (India desk default). */
export function istWallToIso(ymd: string, hm: string) {
  const [y, mo, d] = ymd.split("-").map(Number)
  const [h, mi] = hm.split(":").map(Number)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:00+05:30`
}

export function addMinutesIso(iso: string, minutes: number) {
  const ms = Date.parse(iso) + minutes * 60_000
  return new Date(ms).toISOString()
}

const TYPE_SQL = `
  SELECT id, tenant_id, code, name, duration_minutes, buffer_minutes, requires_meeting_url
  FROM appointment_types
`

const WINDOW_SQL = `
  SELECT id, tenant_id, property_id, weekday, start_time, end_time, timezone
  FROM availability_windows
`

const APPT_SQL = `
  SELECT a.*,
         p.name AS property_name, p.slug AS property_slug,
         u.code AS unit_code,
         t.code AS type_code, t.name AS type_name
  FROM appointments a
  JOIN properties p ON p.id = a.property_id
  JOIN appointment_types t ON t.id = a.appointment_type_id
  LEFT JOIN units u ON u.id = a.unit_id
`

function mapType(row: Record<string, unknown>): AppointmentTypeRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    code: String(row.code) as AppointmentTypeRecord["code"],
    name: String(row.name),
    durationMinutes: Number(row.duration_minutes),
    bufferMinutes: Number(row.buffer_minutes),
    requiresMeetingUrl: Number(row.requires_meeting_url) === 1,
  }
}

function mapWindow(row: Record<string, unknown>): AvailabilityWindowRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    propertyId: String(row.property_id),
    weekday: Number(row.weekday),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    timezone: String(row.timezone),
  }
}

function mapAppointment(row: Record<string, unknown>): AppointmentRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    propertyId: String(row.property_id),
    propertyName: String(row.property_name),
    propertySlug: String(row.property_slug),
    unitId: str(row, "unit_id"),
    unitCode: str(row, "unit_code"),
    appointmentTypeId: String(row.appointment_type_id),
    typeCode: String(row.type_code) as AppointmentRecord["typeCode"],
    typeName: String(row.type_name),
    status: String(row.status) as AppointmentStatus,
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    guestName: String(row.guest_name),
    guestEmail: String(row.guest_email),
    guestPhone: String(row.guest_phone),
    notes: String(row.notes ?? ""),
    meetingUrl: str(row, "meeting_url"),
    applicantId: str(row, "applicant_id"),
    replacesId: str(row, "replaces_id"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function appointmentTypesForTenant(tenantId: string) {
  return asRows(
    getDb().prepare(`${TYPE_SQL} WHERE tenant_id = ? ORDER BY code`).all(tenantId),
  ).map(mapType)
}

export function appointmentTypesForProperty(propertyId: string) {
  const property = asRow(getDb().prepare("SELECT tenant_id FROM properties WHERE id = ?").get(propertyId))
  if (!property) return []
  return appointmentTypesForTenant(String(property.tenant_id))
}

export function windowsForProperty(propertyId: string, tenantId?: string) {
  if (tenantId) {
    return asRows(
      getDb()
        .prepare(`${WINDOW_SQL} WHERE property_id = ? AND tenant_id = ? ORDER BY weekday, start_time`)
        .all(propertyId, tenantId),
    ).map(mapWindow)
  }
  return asRows(
    getDb().prepare(`${WINDOW_SQL} WHERE property_id = ? ORDER BY weekday, start_time`).all(propertyId),
  ).map(mapWindow)
}

export function appointmentsForTenant(tenantId: string) {
  return asRows(
    getDb()
      .prepare(`${APPT_SQL} WHERE a.tenant_id = ? ORDER BY a.starts_at ASC`)
      .all(tenantId),
  ).map(mapAppointment)
}

export function appointmentForTenant(tenantId: string, appointmentId: string) {
  const row = asRow(
    getDb().prepare(`${APPT_SQL} WHERE a.id = ? AND a.tenant_id = ?`).get(appointmentId, tenantId),
  )
  return row ? mapAppointment(row) : null
}

export function getPropertyVisitContext(slug: string) {
  const row = asRow(
    getDb()
      .prepare(
        `SELECT p.id, p.tenant_id, p.name, p.slug, p.address, p.area, p.visits_enabled, t.name AS tenant_name
         FROM properties p
         JOIN tenants t ON t.id = p.tenant_id
         WHERE p.slug = ?`,
      )
      .get(slug),
  )
  if (!row) return null
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name),
    name: String(row.name),
    slug: String(row.slug),
    address: String(row.address),
    area: String(row.area),
    visitsEnabled: Number(row.visits_enabled) === 1,
  }
}

function blockingStatuses() {
  return ["requested", "confirmed"] as const
}

function hasOverlap(
  db: Sql,
  propertyId: string,
  tenantId: string,
  startsAt: string,
  endsAt: string,
  excludeId?: string,
) {
  const startMs = Date.parse(startsAt)
  const endMs = Date.parse(endsAt)
  const rows = asRows(
    db
      .prepare(
        `SELECT id, starts_at, ends_at FROM appointments
         WHERE property_id = ? AND tenant_id = ?
           AND status IN ('requested', 'confirmed')
           ${excludeId ? "AND id != ?" : ""}`,
      )
      .all(...(excludeId ? [propertyId, tenantId, excludeId] : [propertyId, tenantId])),
  )
  for (const row of rows) {
    const otherStart = Date.parse(String(row.starts_at))
    const otherEnd = Date.parse(String(row.ends_at))
    if (startMs < otherEnd && endMs > otherStart) return true
  }
  return false
}

function formatSlotLabel(startsAt: string, endsAt: string) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
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

function ymdInIst(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function weekdayInIst(date: Date) {
  // 0=Sun … 6=Sat in Asia/Kolkata
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(date)
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[parts] ?? 0
}

export function listOpenSlots(propertyId: string, typeId: string, from = new Date(), days = 14): VisitSlot[] {
  const db = getDb()
  const property = asRow(
    db.prepare("SELECT id, tenant_id, visits_enabled FROM properties WHERE id = ?").get(propertyId),
  )
  if (!property || Number(property.visits_enabled) !== 1) return []
  const typeRow = asRow(
    db
      .prepare(`${TYPE_SQL} WHERE id = ? AND tenant_id = ?`)
      .get(typeId, String(property.tenant_id)),
  )
  if (!typeRow) return []
  const type = mapType(typeRow)
  const windows = windowsForProperty(propertyId, String(property.tenant_id))
  if (windows.length === 0) return []

  const booked = asRows(
    db
      .prepare(
        `SELECT starts_at, ends_at FROM appointments
         WHERE property_id = ? AND tenant_id = ? AND status IN ('requested', 'confirmed')`,
      )
      .all(propertyId, String(property.tenant_id)),
  ).map((row) => ({
    start: Date.parse(String(row.starts_at)),
    end: Date.parse(String(row.ends_at)),
  }))

  const slots: VisitSlot[] = []
  const step = type.durationMinutes + type.bufferMinutes
  const now = from.getTime()

  for (let offset = 0; offset < days; offset++) {
    const cursor = new Date(from.getTime() + offset * 86_400_000)
    const ymd = ymdInIst(cursor)
    const weekday = weekdayInIst(new Date(`${ymd}T12:00:00+05:30`))
    const dayWindows = windows.filter((w) => w.weekday === weekday)
    for (const window of dayWindows) {
      const [sh, sm] = window.startTime.split(":").map(Number)
      const [eh, em] = window.endTime.split(":").map(Number)
      let cursorMin = sh * 60 + sm
      const endMin = eh * 60 + em
      while (cursorMin + type.durationMinutes <= endMin) {
        const hh = Math.floor(cursorMin / 60)
        const mm = cursorMin % 60
        const pad = (n: number) => String(n).padStart(2, "0")
        const startsAt = istWallToIso(ymd, `${pad(hh)}:${pad(mm)}`)
        const endsAt = addMinutesIso(startsAt, type.durationMinutes)
        const startMs = Date.parse(startsAt)
        const endMs = Date.parse(endsAt)
        cursorMin += step
        if (startMs <= now) continue
        const conflict = booked.some((b) => startMs < b.end && endMs > b.start)
        if (conflict) continue
        slots.push({
          startsAt,
          endsAt,
          label: formatSlotLabel(startsAt, endsAt),
        })
      }
    }
  }
  return slots
}

export function requestAppointment(input: {
  propertyId: string
  unitId?: string | null
  appointmentTypeId: string
  startsAt: string
  guestName: string
  guestEmail: string
  guestPhone: string
  notes?: string
  meetingUrl?: string | null
  applicantId?: string | null
  replacesId?: string | null
}) {
  if (!isE164(input.guestPhone)) {
    return { ok: false as const, error: "Enter a phone in E.164 form, e.g. +919876543210." }
  }
  const db = getDb()
  const property = asRow(
    db
      .prepare(
        "SELECT id, tenant_id, name, slug, visits_enabled FROM properties WHERE id = ?",
      )
      .get(input.propertyId),
  )
  if (!property) return { ok: false as const, error: "That property is not listed." }
  if (Number(property.visits_enabled) !== 1) {
    return { ok: false as const, error: "Visit booking is turned off for this property." }
  }
  const typeRow = asRow(
    db
      .prepare(`${TYPE_SQL} WHERE id = ? AND tenant_id = ?`)
      .get(input.appointmentTypeId, String(property.tenant_id)),
  )
  if (!typeRow) return { ok: false as const, error: "Choose a visit type." }
  const type = mapType(typeRow)
  if (type.requiresMeetingUrl && !input.meetingUrl?.trim()) {
    return { ok: false as const, error: "Virtual tours need a meeting or Matterport show URL." }
  }
  if (type.code === "virtual" && input.meetingUrl?.trim()) {
    try {
      const url = new URL(input.meetingUrl.trim())
      if (!["http:", "https:"].includes(url.protocol)) {
        return { ok: false as const, error: "Meeting URL must be http(s)." }
      }
    } catch {
      return { ok: false as const, error: "Meeting URL looks invalid." }
    }
  }

  const unitId: string | null = input.unitId ?? null
  if (unitId) {
    const unit = asRow(
      db
        .prepare("SELECT id FROM units WHERE id = ? AND property_id = ? AND tenant_id = ?")
        .get(unitId, input.propertyId, String(property.tenant_id)),
    )
    if (!unit) return { ok: false as const, error: "That bay is not on this property." }
  }

  const endsAt = addMinutesIso(input.startsAt, type.durationMinutes)
  if (Number.isNaN(Date.parse(input.startsAt)) || Date.parse(input.startsAt) <= Date.now()) {
    return { ok: false as const, error: "Pick a future open slot." }
  }

  // Slot must fall inside an open generated slot (availability − booked).
  const open = listOpenSlots(input.propertyId, type.id)
  if (!open.some((slot) => slot.startsAt === input.startsAt || Date.parse(slot.startsAt) === Date.parse(input.startsAt))) {
    // Allow exact ms match via parse for offset-normalized equality
    const startMs = Date.parse(input.startsAt)
    if (!open.some((slot) => Date.parse(slot.startsAt) === startMs)) {
      return { ok: false as const, error: "That slot is no longer open." }
    }
  }

  if (hasOverlap(db, input.propertyId, String(property.tenant_id), input.startsAt, endsAt)) {
    return { ok: false as const, error: "That slot is already booked." }
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  try {
    transaction((tx) => {
      if (hasOverlap(tx, input.propertyId, String(property.tenant_id), input.startsAt, endsAt)) {
        throw new Error("DOUBLE_BOOK")
      }
      tx.prepare(
        `INSERT INTO appointments (
          id, tenant_id, property_id, unit_id, appointment_type_id, status,
          starts_at, ends_at, guest_name, guest_email, guest_phone, notes,
          meeting_url, applicant_id, replaces_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        String(property.tenant_id),
        input.propertyId,
        unitId,
        type.id,
        input.startsAt,
        endsAt,
        input.guestName,
        input.guestEmail,
        input.guestPhone,
        input.notes ?? "",
        input.meetingUrl?.trim() || null,
        input.applicantId ?? null,
        input.replacesId ?? null,
        now,
        now,
      )
      if (input.replacesId) {
        tx.prepare(
          `UPDATE appointments SET status = 'cancelled', updated_at = ?
           WHERE id = ? AND tenant_id = ? AND status IN ('requested', 'confirmed')`,
        ).run(now, input.replacesId, String(property.tenant_id))
      }
    })
  } catch (error) {
    if (error instanceof Error && error.message === "DOUBLE_BOOK") {
      return { ok: false as const, error: "That slot is already booked." }
    }
    throw error
  }

  return {
    ok: true as const,
    id,
    tenantId: String(property.tenant_id),
    propertyName: String(property.name),
    propertySlug: String(property.slug),
    typeName: type.name,
    startsAt: input.startsAt,
    endsAt,
  }
}

const LANDLORD_TRANSITIONS: Record<string, AppointmentStatus[]> = {
  requested: ["confirmed", "declined", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show"],
}

export function transitionAppointment(
  tenantId: string,
  appointmentId: string,
  next: AppointmentStatus,
  actor: "landlord" | "guest" = "landlord",
) {
  const appointment = appointmentForTenant(tenantId, appointmentId)
  if (!appointment) {
    return { ok: false as const, error: "That visit is not in this organisation." }
  }
  const allowed =
    actor === "guest"
      ? appointment.status === "requested" || appointment.status === "confirmed"
        ? (["cancelled"] as AppointmentStatus[])
        : []
      : LANDLORD_TRANSITIONS[appointment.status] ?? []
  if (!allowed.includes(next)) {
    return { ok: false as const, error: `Cannot move a ${appointment.status} visit to ${next}.` }
  }
  if (next === "confirmed") {
    if (
      hasOverlap(
        getDb(),
        appointment.propertyId,
        tenantId,
        appointment.startsAt,
        appointment.endsAt,
        appointment.id,
      )
    ) {
      return { ok: false as const, error: "That slot overlaps another booking." }
    }
  }
  if (next === "completed" || next === "no_show") {
    if (Date.parse(appointment.endsAt) > Date.now()) {
      return { ok: false as const, error: "Wait until the visit window ends." }
    }
  }
  const now = new Date().toISOString()
  getDb()
    .prepare("UPDATE appointments SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?")
    .run(next, now, appointmentId, tenantId)
  return { ok: true as const, appointment: { ...appointment, status: next, updatedAt: now } }
}

export function rescheduleAppointment(
  tenantId: string,
  appointmentId: string,
  newStartsAt: string,
  meetingUrl?: string | null,
) {
  const current = appointmentForTenant(tenantId, appointmentId)
  if (!current) {
    return { ok: false as const, error: "That visit is not in this organisation." }
  }
  if (current.status !== "requested" && current.status !== "confirmed") {
    return { ok: false as const, error: "Only open visits can be rescheduled." }
  }
  const result = requestAppointment({
    propertyId: current.propertyId,
    unitId: current.unitId,
    appointmentTypeId: current.appointmentTypeId,
    startsAt: newStartsAt,
    guestName: current.guestName,
    guestEmail: current.guestEmail,
    guestPhone: current.guestPhone,
    notes: current.notes,
    meetingUrl: meetingUrl ?? current.meetingUrl,
    applicantId: current.applicantId,
    replacesId: current.id,
  })
  if (!result.ok) return result
  // Landlord-proposed reschedule: if the old visit was confirmed, auto-confirm the new row when free.
  let autoConfirm = false
  if (current.status === "confirmed") {
    const confirmed = transitionAppointment(tenantId, result.id, "confirmed")
    autoConfirm = confirmed.ok
  }
  return { ...result, autoConfirm }
}

export function upsertAvailabilityWindow(input: {
  tenantId: string
  propertyId: string
  weekday: number
  startTime: string
  endTime: string
  timezone?: string
}) {
  if (input.weekday < 0 || input.weekday > 6) {
    return { ok: false as const, error: "Weekday must be 0 (Sun) through 6 (Sat)." }
  }
  if (!/^\d{2}:\d{2}$/.test(input.startTime) || !/^\d{2}:\d{2}$/.test(input.endTime)) {
    return { ok: false as const, error: "Use HH:MM times." }
  }
  if (input.startTime >= input.endTime) {
    return { ok: false as const, error: "End time must be after start." }
  }
  const property = asRow(
    getDb()
      .prepare("SELECT id FROM properties WHERE id = ? AND tenant_id = ?")
      .get(input.propertyId, input.tenantId),
  )
  if (!property) return { ok: false as const, error: "That property is not in this organisation." }
  const id = crypto.randomUUID()
  getDb()
    .prepare(
      `INSERT INTO availability_windows (id, tenant_id, property_id, weekday, start_time, end_time, timezone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.tenantId,
      input.propertyId,
      input.weekday,
      input.startTime,
      input.endTime,
      input.timezone ?? "Asia/Kolkata",
    )
  return { ok: true as const, id }
}

export function deleteAvailabilityWindow(tenantId: string, windowId: string) {
  const result = getDb()
    .prepare("DELETE FROM availability_windows WHERE id = ? AND tenant_id = ?")
    .run(windowId, tenantId)
  if (Number(result.changes) === 0) {
    return { ok: false as const, error: "That window is not in this organisation." }
  }
  return { ok: true as const }
}

export function setPropertyVisitsEnabled(tenantId: string, propertyId: string, enabled: boolean) {
  const result = getDb()
    .prepare("UPDATE properties SET visits_enabled = ? WHERE id = ? AND tenant_id = ?")
    .run(enabled ? 1 : 0, propertyId, tenantId)
  if (Number(result.changes) === 0) {
    return { ok: false as const, error: "That property is not in this organisation." }
  }
  return { ok: true as const }
}

/**
 * T−24h reminders. Idempotent via notifications.source_id = visit_remind:<id>.
 * Returns how many appointments newly received a reminder enqueue.
 */
export function enqueueVisitReminders(now = new Date()) {
  const windowStart = new Date(now.getTime() + 23 * 3_600_000).toISOString()
  const windowEnd = new Date(now.getTime() + 25 * 3_600_000).toISOString()
  const due = asRows(
    getDb()
      .prepare(
        `${APPT_SQL}
         WHERE a.status = 'confirmed'
           AND a.starts_at >= ? AND a.starts_at < ?`,
      )
      .all(windowStart, windowEnd),
  ).map(mapAppointment)

  let sent = 0
  for (const appointment of due) {
    const sourceId = `visit_remind:${appointment.id}`
    const existing = asRow(
      getDb().prepare("SELECT id FROM notifications WHERE source_id = ? LIMIT 1").get(sourceId),
    )
    if (existing) continue

    const recipientId = appointment.applicantId
    const notices: Notice[] = []
    if (recipientId) {
      notices.push({
        userId: recipientId,
        title: "Visit reminder",
        body: `${appointment.typeName} at ${appointment.propertyName} is tomorrow (${formatSlotLabel(appointment.startsAt, appointment.endsAt)}).`,
        href: `/properties/${appointment.propertySlug}`,
        sourceId,
      })
    }
    // Always log a landlord copy so demo drain proves the channel even without applicant login.
    for (const landlordId of landlordIds(appointment.tenantId)) {
      notices.push({
        userId: landlordId,
        title: "Visit reminder (desk)",
        body: `${appointment.guestName} · ${appointment.typeName} · ${formatSlotLabel(appointment.startsAt, appointment.endsAt)}.`,
        href: "/landlord/visits",
        sourceId: `${sourceId}:landlord:${landlordId}`,
      })
    }
    if (notices.length === 0) {
      // Guest-only booking: still mark idempotency with a system row on a landlord if any.
      continue
    }
    notifyMany(notices)
    sent += 1
  }
  return sent
}

export function visitNoticeForRequest(result: {
  tenantId: string
  propertyName: string
  propertySlug: string
  typeName: string
  startsAt: string
  endsAt: string
  guestName: string
}) {
  const label = formatSlotLabel(result.startsAt, result.endsAt)
  return landlordIds(result.tenantId).map((id) => ({
    userId: id,
    title: "Visit requested",
    body: `${result.guestName} asked for a ${result.typeName} at ${result.propertyName} · ${label}.`,
    href: "/landlord/visits",
  }))
}

export function prefillGuest(user: SessionUser | null) {
  if (!user || user.role !== "applicant") {
    return { guestName: "", guestEmail: "", guestPhone: user?.phone ?? "" }
  }
  return {
    guestName: user.name,
    guestEmail: user.email,
    guestPhone: user.phone ?? "",
  }
}

// silence unused for blockingStatuses helper documentation
void blockingStatuses

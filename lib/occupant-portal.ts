import "server-only"
import {
  getDb,
  landlordIds,
} from "@/lib/db"
import { daysBetween, interestPaise } from "@/lib/interest"
import { demoESign, hydrateDemoEnvelope } from "@/lib/esign"
import {
  addDays,
  todayISO,
  type EnvelopeStatus,
  type Role,
  type TicketCategory,
  type TicketStatus,
} from "@/lib/format"

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

/* ─── Slice C: occupant portal ─────────────────────────────────────────── */

export type LeaseRecord = {
  id: string
  tenantId: string
  tenantName: string
  unitId: string
  unitCode: string
  propertyId: string
  propertyName: string
  propertySlug: string
  occupantId: string
  applicationId: string
  status: string
  startedOn: string
  createdAt: string
}

const LEASE_SQL = `
  SELECT l.*, t.name AS tenant_name, u.code AS unit_code,
         p.id AS property_id, p.name AS property_name, p.slug AS property_slug
  FROM leases l
  JOIN tenants t ON t.id = l.tenant_id
  JOIN units u ON u.id = l.unit_id
  JOIN properties p ON p.id = u.property_id
`

function mapLease(row: Record<string, unknown>): LeaseRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name),
    unitId: String(row.unit_id),
    unitCode: String(row.unit_code),
    propertyId: String(row.property_id),
    propertyName: String(row.property_name),
    propertySlug: String(row.property_slug),
    occupantId: String(row.occupant_id),
    applicationId: String(row.application_id),
    status: String(row.status),
    startedOn: String(row.started_on),
    createdAt: String(row.created_at),
  }
}

/** Active portal leases (leases table). Shop also uses this after Seed C. */
export function leasesForOccupant(userId: string) {
  return asRows(
    getDb()
      .prepare(`${LEASE_SQL} WHERE l.occupant_id = ? AND l.status = 'active' ORDER BY l.started_on DESC`)
      .all(userId),
  ).map(mapLease)
}

export function leasesForTenant(tenantId: string) {
  return asRows(
    getDb()
      .prepare(`${LEASE_SQL} WHERE l.tenant_id = ? AND l.status = 'active' ORDER BY l.started_on DESC`)
      .all(tenantId),
  ).map(mapLease)
}

export function hasActiveLease(userId: string) {
  return leasesForOccupant(userId).length > 0
}

export function acceptOccupantInvite(token: string, userId: string) {
  const db = getDb()
  const row = asRow(
    db
      .prepare(
        `SELECT id, occupant_id, lease_id, accepted_at FROM occupant_invites WHERE token = ?`,
      )
      .get(token),
  )
  if (!row) return { ok: false as const, error: "That invite link is not valid." }
  if (String(row.occupant_id) !== userId) {
    return { ok: false as const, error: "Sign in as the invited occupant to accept." }
  }
  if (row.accepted_at) return { ok: true as const, already: true as const, leaseId: String(row.lease_id) }
  db.prepare("UPDATE occupant_invites SET accepted_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    String(row.id),
  )
  return { ok: true as const, already: false as const, leaseId: String(row.lease_id) }
}

export function inviteByToken(token: string) {
  const row = asRow(
    getDb()
      .prepare(
        `SELECT oi.*, t.name AS tenant_name, u.code AS unit_code, p.name AS property_name
         FROM occupant_invites oi
         JOIN tenants t ON t.id = oi.tenant_id
         JOIN leases l ON l.id = oi.lease_id
         JOIN units u ON u.id = l.unit_id
         JOIN properties p ON p.id = u.property_id
         WHERE oi.token = ?`,
      )
      .get(token),
  )
  if (!row) return null
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name),
    leaseId: String(row.lease_id),
    occupantId: String(row.occupant_id),
    email: String(row.email),
    unitCode: String(row.unit_code),
    propertyName: String(row.property_name),
    acceptedAt: str(row, "accepted_at"),
  }
}

export type PortalTicketRecord = {
  id: string
  tenantId: string
  leaseId: string
  unitId: string
  unitCode: string
  propertyName: string
  occupantId: string
  occupantName: string
  category: TicketCategory
  subject: string
  body: string
  photoName: string | null
  status: TicketStatus
  createdAt: string
  updatedAt: string
}

const TICKET_SQL = `
  SELECT tk.*, u.code AS unit_code, p.name AS property_name, usr.name AS occupant_name
  FROM tickets tk
  JOIN units u ON u.id = tk.unit_id
  JOIN properties p ON p.id = u.property_id
  JOIN users usr ON usr.id = tk.occupant_id
`

function mapTicket(row: Record<string, unknown>): PortalTicketRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    leaseId: String(row.lease_id ?? ""),
    unitId: String(row.unit_id),
    unitCode: String(row.unit_code),
    propertyName: String(row.property_name),
    occupantId: String(row.occupant_id),
    occupantName: String(row.occupant_name),
    category: String(row.category ?? "other") as TicketCategory,
    subject: String(row.subject),
    body: String(row.body),
    photoName: str(row, "photo_name"),
    status: String(row.status) as TicketStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function ticketsForOccupant(userId: string) {
  return asRows(
    getDb().prepare(`${TICKET_SQL} WHERE tk.occupant_id = ? ORDER BY tk.created_at DESC`).all(userId),
  ).map(mapTicket)
}

export function ticketsForTenant(tenantId: string) {
  return asRows(
    getDb().prepare(`${TICKET_SQL} WHERE tk.tenant_id = ? ORDER BY tk.created_at DESC`).all(tenantId),
  ).map(mapTicket)
}

export function createTicket(input: {
  occupantId: string
  leaseId: string
  category: TicketCategory
  subject: string
  body: string
  photoName?: string | null
}) {
  const db = getDb()
  const lease = asRow(
    db
      .prepare(
        `SELECT l.id, l.tenant_id, l.unit_id, l.occupant_id, u.property_id
         FROM leases l JOIN units u ON u.id = l.unit_id
         WHERE l.id = ? AND l.occupant_id = ? AND l.status = 'active'`,
      )
      .get(input.leaseId, input.occupantId),
  )
  if (!lease) return { ok: false as const, error: "No active lease for that unit." }
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO tickets (
      id, tenant_id, property_id, lease_id, unit_id, user_id, occupant_id,
      category, subject, body, photo_name, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
  ).run(
    id,
    String(lease.tenant_id),
    String(lease.property_id),
    String(lease.id),
    String(lease.unit_id),
    input.occupantId,
    input.occupantId,
    input.category,
    input.subject,
    input.body,
    input.photoName ?? null,
    now,
    now,
  )
  return { ok: true as const, id, tenantId: String(lease.tenant_id) }
}

const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ["in_progress", "cancelled"],
  in_progress: ["resolved", "cancelled"],
  resolved: ["closed"],
  closed: [],
  cancelled: [],
}

export function transitionTicket(input: {
  ticketId: string
  actorId: string
  actorRole: Role
  tenantId: string | null
  next: TicketStatus
}) {
  const db = getDb()
  const row = asRow(db.prepare(`${TICKET_SQL} WHERE tk.id = ?`).get(input.ticketId))
  if (!row) return { ok: false as const, error: "Ticket not found." }
  const ticket = mapTicket(row)
  if (input.actorRole === "landlord_admin") {
    if (!input.tenantId || ticket.tenantId !== input.tenantId) {
      return { ok: false as const, error: "That ticket is not in this organisation." }
    }
  } else if (input.actorRole === "applicant") {
    if (ticket.occupantId !== input.actorId) {
      return { ok: false as const, error: "That ticket is not yours." }
    }
    if (input.next === "in_progress" || input.next === "resolved") {
      return { ok: false as const, error: "Only the landlord can advance that status." }
    }
  } else {
    return { ok: false as const, error: "Not allowed." }
  }
  const allowed = TICKET_TRANSITIONS[ticket.status] ?? []
  if (!allowed.includes(input.next)) {
    return { ok: false as const, error: `Cannot move from ${ticket.status} to ${input.next}.` }
  }
  db.prepare("UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?").run(
    input.next,
    new Date().toISOString(),
    ticket.id,
  )
  return { ok: true as const, ticket: { ...ticket, status: input.next } }
}

/**
 * Accrue simple daily interest after grace. One interest line per rent
 * (source_id = rent id); amount is updated to the cumulative paise total.
 */
export function accrueInterest(tenantId: string, asOf = todayISO()) {
  const db = getDb()
  const ruleRow = asRow(
    db
      .prepare(
        "SELECT grace_days, interest_rate_apr FROM late_fee_rules WHERE tenant_id = ?",
      )
      .get(tenantId),
  )
  const rule = {
    graceDays: Number(ruleRow?.grace_days ?? 5),
    interestRateApr: Number(ruleRow?.interest_rate_apr ?? 18),
  }
  const rents = asRows(
    db
      .prepare(
        `SELECT id, unit_id, user_id, amount_cents, due_on, description
         FROM ledger_entries WHERE tenant_id = ? AND kind = 'rent' AND status = 'due'`,
      )
      .all(tenantId),
  )
  let touched = 0
  for (const rent of rents) {
    const dueOn = str(rent, "due_on")
    if (!dueOn) continue
    const graceEnd = addDays(dueOn, rule.graceDays)
    const days = daysBetween(graceEnd, asOf)
    if (days <= 0) continue
    const amount = interestPaise(Number(rent.amount_cents), rule.interestRateApr, days)
    if (amount <= 0) continue
    const existing = asRow(
      db
        .prepare(
          "SELECT id FROM ledger_entries WHERE tenant_id = ? AND kind = 'interest' AND source_id = ?",
        )
        .get(tenantId, String(rent.id)),
    )
    const description = `Interest · ${String(rent.description)} · ${rule.interestRateApr}% APR · ${days} day${days === 1 ? "" : "s"} after grace`
    if (existing) {
      db.prepare(
        "UPDATE ledger_entries SET amount_cents = ?, description = ?, due_on = ? WHERE id = ?",
      ).run(amount, description, asOf, String(existing.id))
    } else {
      db.prepare(
        `INSERT INTO ledger_entries (
          id, tenant_id, unit_id, user_id, kind, description, amount_cents, status, due_on, created_at, source_id
        ) VALUES (?, ?, ?, ?, 'interest', ?, ?, 'due', ?, ?, ?)`,
      ).run(
        crypto.randomUUID(),
        tenantId,
        String(rent.unit_id),
        String(rent.user_id),
        description,
        amount,
        asOf,
        new Date().toISOString(),
        String(rent.id),
      )
    }
    touched += 1
  }
  return touched
}

/**
 * Rent / membership reminders: T−3 and T+1 if unpaid.
 * Idempotent on (line_id, reminder_kind, scheduled_date).
 */
export function enqueueRentReminders(tenantId: string, asOf = todayISO()) {
  const db = getDb()
  const lines = asRows(
    db
      .prepare(
        `SELECT id, user_id, due_on, description, kind
         FROM ledger_entries
         WHERE tenant_id = ? AND status = 'due' AND kind IN ('rent', 'gst') AND due_on IS NOT NULL`,
      )
      .all(tenantId),
  )
  const notices: { userId: string; title: string; body: string; href: string }[] = []
  let created = 0
  for (const line of lines) {
    const dueOn = str(line, "due_on")
    if (!dueOn) continue
    const kinds: { kind: string; when: string }[] = [
      { kind: "t_minus_3", when: addDays(dueOn, -3) },
      { kind: "t_plus_1", when: addDays(dueOn, 1) },
    ]
    for (const item of kinds) {
      if (item.when !== asOf) continue
      const existing = asRow(
        db
          .prepare(
            `SELECT id FROM reminder_log
             WHERE line_id = ? AND reminder_kind = ? AND scheduled_date = ?`,
          )
          .get(String(line.id), item.kind, asOf),
      )
      if (existing) continue
      db.prepare(
        `INSERT INTO reminder_log (id, tenant_id, line_id, reminder_kind, scheduled_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(crypto.randomUUID(), tenantId, String(line.id), item.kind, asOf, new Date().toISOString())
      const label = item.kind === "t_minus_3" ? "due in 3 days" : "1 day past due"
      notices.push({
        userId: String(line.user_id),
        title: item.kind === "t_minus_3" ? "Rent reminder" : "Overdue reminder",
        body: `${String(line.description)} is ${label}. Open the portal to pay (demo).`,
        href: "/portal",
      })
      created += 1
    }
  }
  return { created, notices }
}

export function acknowledgeReminder(userId: string, lineId: string) {
  const entry = asRow(
    getDb()
      .prepare("SELECT id, user_id FROM ledger_entries WHERE id = ? AND user_id = ?")
      .get(lineId, userId),
  )
  if (!entry) return { ok: false as const, error: "That charge is not on your ledger." }
  getDb()
    .prepare(
      `INSERT INTO reminder_log (id, tenant_id, line_id, reminder_kind, scheduled_date, created_at)
       SELECT ?, tenant_id, id, 'ack', ?, ?
       FROM ledger_entries WHERE id = ?
       ON CONFLICT(line_id, reminder_kind, scheduled_date) DO NOTHING`,
    )
    .run(crypto.randomUUID(), todayISO(), new Date().toISOString(), lineId)
  return { ok: true as const }
}

export type EnvelopeRow = {
  id: string
  tenantId: string
  leaseId: string
  unitId: string
  unitCode: string
  propertyName: string
  occupantId: string
  occupantName: string
  documentName: string
  status: EnvelopeStatus
  signatoryName: string
  signatoryEmail: string
  signedPath: string | null
  createdAt: string
  updatedAt: string
}

const ENVELOPE_SQL = `
  SELECT e.*, u.code AS unit_code, p.name AS property_name, usr.name AS occupant_name
  FROM esign_envelopes e
  JOIN units u ON u.id = e.unit_id
  JOIN properties p ON p.id = u.property_id
  JOIN users usr ON usr.id = e.occupant_id
`

function mapEnvelope(row: Record<string, unknown>): EnvelopeRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    leaseId: String(row.lease_id),
    unitId: String(row.unit_id),
    unitCode: String(row.unit_code),
    propertyName: String(row.property_name),
    occupantId: String(row.occupant_id),
    occupantName: String(row.occupant_name),
    documentName: String(row.document_name),
    status: String(row.status) as EnvelopeStatus,
    signatoryName: String(row.signatory_name),
    signatoryEmail: String(row.signatory_email),
    signedPath: str(row, "signed_path"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function syncEnvelopeMemory(row: EnvelopeRow) {
  hydrateDemoEnvelope({
    id: row.id,
    status: row.status,
    documentName: row.documentName,
    signatoryName: row.signatoryName,
    signatoryEmail: row.signatoryEmail,
    signedPath: row.signedPath,
  })
}

export function envelopesForOccupant(userId: string) {
  const rows = asRows(
    getDb().prepare(`${ENVELOPE_SQL} WHERE e.occupant_id = ? ORDER BY e.created_at DESC`).all(userId),
  ).map(mapEnvelope)
  for (const row of rows) syncEnvelopeMemory(row)
  return rows
}

export function envelopesForTenant(tenantId: string) {
  const rows = asRows(
    getDb().prepare(`${ENVELOPE_SQL} WHERE e.tenant_id = ? ORDER BY e.created_at DESC`).all(tenantId),
  ).map(mapEnvelope)
  for (const row of rows) syncEnvelopeMemory(row)
  return rows
}

export function createAndSendEnvelope(input: {
  tenantId: string
  leaseId: string
  documentName: string
}) {
  const db = getDb()
  const lease = asRow(
    db
      .prepare(
        `SELECT l.id, l.tenant_id, l.unit_id, l.occupant_id, usr.name AS occupant_name, usr.email AS occupant_email
         FROM leases l JOIN users usr ON usr.id = l.occupant_id
         WHERE l.id = ? AND l.tenant_id = ? AND l.status = 'active'`,
      )
      .get(input.leaseId, input.tenantId),
  )
  if (!lease) return { ok: false as const, error: "Active lease not found in this organisation." }
  const created = demoESign.createEnvelope({
    documentName: input.documentName,
    signatoryName: String(lease.occupant_name),
    signatoryEmail: String(lease.occupant_email),
  })
  demoESign.send(created.envelopeId)
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO esign_envelopes (
      id, tenant_id, lease_id, unit_id, occupant_id, document_name, status,
      signatory_name, signatory_email, signed_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'sent', ?, ?, NULL, ?, ?)`,
  ).run(
    created.envelopeId,
    input.tenantId,
    String(lease.id),
    String(lease.unit_id),
    String(lease.occupant_id),
    input.documentName,
    String(lease.occupant_name),
    String(lease.occupant_email),
    now,
    now,
  )
  return {
    ok: true as const,
    envelopeId: created.envelopeId,
    occupantId: String(lease.occupant_id),
  }
}

export function completeDemoEnvelope(envelopeId: string, occupantId: string) {
  const db = getDb()
  const row = asRow(
    db.prepare(`${ENVELOPE_SQL} WHERE e.id = ? AND e.occupant_id = ?`).get(envelopeId, occupantId),
  )
  if (!row) return { ok: false as const, error: "Envelope not found." }
  const envelope = mapEnvelope(row)
  syncEnvelopeMemory(envelope)
  if (envelope.status !== "sent") {
    return { ok: false as const, error: "This document is not awaiting signature." }
  }
  const signed = demoESign.complete(envelopeId, envelope.signatoryName)
  db.prepare(
    "UPDATE esign_envelopes SET status = 'completed', signed_path = ?, updated_at = ? WHERE id = ?",
  ).run(signed.signedPath, new Date().toISOString(), envelopeId)
  return { ok: true as const, signedPath: signed.signedPath, tenantId: envelope.tenantId }
}

/** Used by decideApplication — create lease + invite inside an open transaction. */
export function insertLeaseAndInvite(
  tx: Sql,
  input: {
    leaseId: string
    tenantId: string
    unitId: string
    occupantId: string
    applicationId: string
    email: string
    inviteToken: string
    startedOn: string
    now: string
  },
) {
  tx.prepare(
    `INSERT INTO leases (id, tenant_id, unit_id, occupant_id, application_id, status, started_on, created_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
  ).run(
    input.leaseId,
    input.tenantId,
    input.unitId,
    input.occupantId,
    input.applicationId,
    input.startedOn,
    input.now,
  )
  tx.prepare(
    `INSERT INTO occupant_invites (id, tenant_id, lease_id, occupant_id, token, email, created_at, accepted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
  ).run(
    crypto.randomUUID(),
    input.tenantId,
    input.leaseId,
    input.occupantId,
    input.inviteToken,
    input.email,
    input.now,
  )
}

// Silence unused in case tree-shaking; landlordIds kept for parity with PR call sites.
void landlordIds

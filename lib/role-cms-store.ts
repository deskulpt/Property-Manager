import "server-only"
import { getDb } from "@/lib/db"
import { money, monthlyRentCents, todayISO } from "@/lib/format"

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

function num(row: Record<string, unknown>, key: string) {
  const value = row[key]
  return value == null ? null : Number(value)
}

/** Managing agent ↔ landlord org access (demo seed collaborations). */
export function agentLandlords(agentUserId: string) {
  return asRows(
    getDb()
      .prepare(
        `SELECT t.id, t.name, t.slug, t.city, t.package,
                (SELECT COUNT(*) FROM properties p WHERE p.tenant_id = t.id) AS property_count,
                (SELECT COUNT(*) FROM applications a WHERE a.tenant_id = t.id AND a.status = 'submitted') AS pending_apps
         FROM agent_landlord_access x
         JOIN tenants t ON t.id = x.tenant_id
         WHERE x.agent_user_id = ?
         ORDER BY t.name`,
      )
      .all(agentUserId),
  ).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    city: String(row.city),
    package: String(row.package),
    propertyCount: Number(row.property_count),
    pendingApps: Number(row.pending_apps),
  }))
}

export function agentCanAccessTenant(agentUserId: string, tenantId: string) {
  const row = asRow(
    getDb()
      .prepare(
        "SELECT 1 AS ok FROM agent_landlord_access WHERE agent_user_id = ? AND tenant_id = ?",
      )
      .get(agentUserId, tenantId),
  )
  return Boolean(row)
}

export function pendingApplicationCount(tenantId: string) {
  const row = asRow(
    getDb()
      .prepare(
        "SELECT COUNT(*) AS c FROM applications WHERE tenant_id = ? AND status = 'submitted'",
      )
      .get(tenantId),
  )
  return Number(row?.c ?? 0)
}

export type TicketStatus = "open" | "in_progress" | "resolved" | "cancelled"

export type TicketRecord = {
  id: string
  tenantId: string
  tenantName: string
  propertyName: string
  unitCode: string | null
  userId: string
  subject: string
  body: string
  status: TicketStatus
  createdAt: string
  updatedAt: string
}

function mapTicket(row: Record<string, unknown>): TicketRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name),
    propertyName: String(row.property_name),
    unitCode: str(row, "unit_code"),
    userId: String(row.user_id ?? row.occupant_id),
    subject: String(row.subject),
    body: String(row.body),
    status: String(row.status) as TicketStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

const TICKET_SQL = `
  SELECT tk.*, t.name AS tenant_name,
         COALESCE(p.name, p2.name) AS property_name, u.code AS unit_code
  FROM tickets tk
  JOIN tenants t ON t.id = tk.tenant_id
  LEFT JOIN properties p ON p.id = tk.property_id
  LEFT JOIN units u ON u.id = tk.unit_id
  LEFT JOIN properties p2 ON p2.id = u.property_id
`

export function ticketsForUser(userId: string) {
  return asRows(
    getDb()
      .prepare(`${TICKET_SQL} WHERE tk.user_id = ? ORDER BY tk.created_at DESC`)
      .all(userId),
  ).map(mapTicket)
}

export function ticketsForTenant(tenantId: string) {
  return asRows(
    getDb()
      .prepare(`${TICKET_SQL} WHERE tk.tenant_id = ? ORDER BY tk.created_at DESC`)
      .all(tenantId),
  ).map(mapTicket)
}

export function createTicket(input: {
  tenantId: string
  propertyId: string
  unitId: string | null
  userId: string
  subject: string
  body: string
}) {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO tickets (
        id, tenant_id, property_id, lease_id, unit_id, user_id, occupant_id, category,
        subject, body, photo_name, status, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, 'other', ?, ?, NULL, 'open', ?, ?)`,
    )
    .run(
      id,
      input.tenantId,
      input.propertyId,
      input.unitId,
      input.userId,
      input.userId,
      input.subject,
      input.body,
      now,
      now,
    )
  return id
}

export function setTicketStatus(userId: string, ticketId: string, status: TicketStatus) {
  const row = asRow(
    getDb().prepare("SELECT id FROM tickets WHERE id = ? AND user_id = ?").get(ticketId, userId),
  )
  if (!row) return { ok: false as const, error: "Ticket not found." }
  getDb()
    .prepare("UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, new Date().toISOString(), ticketId)
  return { ok: true as const }
}

export type NotifPrefs = {
  applications: boolean
  visits: boolean
  tickets: boolean
  ledger: boolean
  shop: boolean
  marketing: boolean
}

export function getNotifPrefs(userId: string): NotifPrefs {
  const row = asRow(
    getDb().prepare("SELECT * FROM user_notification_prefs WHERE user_id = ?").get(userId),
  )
  if (!row) {
    return {
      applications: true,
      visits: true,
      tickets: true,
      ledger: true,
      shop: true,
      marketing: false,
    }
  }
  return {
    applications: Number(row.applications) === 1,
    visits: Number(row.visits) === 1,
    tickets: Number(row.tickets) === 1,
    ledger: Number(row.ledger) === 1,
    shop: Number(row.shop) === 1,
    marketing: Number(row.marketing) === 1,
  }
}

export function saveNotifPrefs(userId: string, prefs: NotifPrefs) {
  getDb()
    .prepare(
      `INSERT INTO user_notification_prefs
         (user_id, applications, visits, tickets, ledger, shop, marketing, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         applications = excluded.applications,
         visits = excluded.visits,
         tickets = excluded.tickets,
         ledger = excluded.ledger,
         shop = excluded.shop,
         marketing = excluded.marketing,
         updated_at = excluded.updated_at`,
    )
    .run(
      userId,
      prefs.applications ? 1 : 0,
      prefs.visits ? 1 : 0,
      prefs.tickets ? 1 : 0,
      prefs.ledger ? 1 : 0,
      prefs.shop ? 1 : 0,
      prefs.marketing ? 1 : 0,
      new Date().toISOString(),
    )
}

export type AgreementStatus =
  | "draft"
  | "ready"
  | "sent"
  | "signed_demo"
  | "aadhaar_esign_demo"

export type AgreementRecord = {
  id: string
  tenantId: string
  unitId: string
  applicationId: string | null
  landlordName: string
  tenantPartyName: string
  propertyLabel: string
  unitCode: string
  rentInrCents: number
  depositInrCents: number
  startDate: string
  endDate: string
  lockInMonths: number
  noticeDays: number
  extras: string
  status: AgreementStatus
  bodyText: string
  createdAt: string
  signedAt: string | null
  esignRequestId: string | null
}

function mapAgreement(row: Record<string, unknown>): AgreementRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    unitId: String(row.unit_id),
    applicationId: str(row, "application_id"),
    landlordName: String(row.landlord_name),
    tenantPartyName: String(row.tenant_party_name),
    propertyLabel: String(row.property_label),
    unitCode: String(row.unit_code),
    rentInrCents: Number(row.rent_inr_cents),
    depositInrCents: Number(row.deposit_inr_cents),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    lockInMonths: Number(row.lock_in_months),
    noticeDays: Number(row.notice_days),
    extras: String(row.extras ?? ""),
    status: String(row.status) as AgreementStatus,
    bodyText: String(row.body_text),
    createdAt: String(row.created_at),
    signedAt: str(row, "signed_at"),
    esignRequestId: str(row, "esign_request_id"),
  }
}

export function buildAgreementBody(input: {
  landlordName: string
  tenantPartyName: string
  propertyLabel: string
  unitCode: string
  rentInrCents: number
  depositInrCents: number
  startDate: string
  endDate: string
  lockInMonths: number
  noticeDays: number
  extras: string
}) {
  const rent = money(input.rentInrCents)
  const deposit = money(input.depositInrCents)
  return [
    "STANDARD INDIA C&I RENTAL AGREEMENT (DEMO TEMPLATE)",
    "",
    `This Agreement is made on ${todayISO()} between:`,
    `Landlord / Lessor: ${input.landlordName}`,
    `Tenant / Lessee: ${input.tenantPartyName}`,
    "",
    `Premises: ${input.propertyLabel}, Unit ${input.unitCode}`,
    `Monthly rent: ${rent} (INR)`,
    `Security deposit: ${deposit} (INR)`,
    `Term: ${input.startDate} to ${input.endDate}`,
    `Lock-in: ${input.lockInMonths} month(s)`,
    `Notice period: ${input.noticeDays} day(s)`,
    "",
    "1. The Tenant shall pay rent in Indian Rupees to the Landlord’s nominated account or UPI / eNACH path.",
    "2. The deposit is refundable subject to deductions for damage beyond fair wear and tear.",
    "3. Either party may terminate after the lock-in by giving the notice period in writing.",
    "4. The Tenant shall not sub-let without prior written consent of the Landlord.",
    "5. This demo document is not legal advice and is not a live eSign / DigiLocker instrument.",
    "",
    input.extras.trim() ? `Additional terms:\n${input.extras.trim()}` : "Additional terms: none.",
    "",
    "Signed (demo): __________________  Landlord",
    "Signed (demo): __________________  Tenant",
  ].join("\n")
}

export function createAgreement(input: {
  tenantId: string
  unitId: string
  applicationId?: string | null
  landlordName: string
  tenantPartyName: string
  propertyLabel: string
  unitCode: string
  rentInrCents: number
  depositInrCents: number
  startDate: string
  endDate: string
  lockInMonths: number
  noticeDays: number
  extras: string
}) {
  const id = crypto.randomUUID()
  const bodyText = buildAgreementBody(input)
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO rental_agreements (
         id, tenant_id, unit_id, application_id, landlord_name, tenant_party_name,
         property_label, unit_code, rent_inr_cents, deposit_inr_cents, start_date, end_date,
         lock_in_months, notice_days, extras, status, body_text, created_at, signed_at, esign_request_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, NULL, NULL)`,
    )
    .run(
      id,
      input.tenantId,
      input.unitId,
      input.applicationId ?? null,
      input.landlordName,
      input.tenantPartyName,
      input.propertyLabel,
      input.unitCode,
      input.rentInrCents,
      input.depositInrCents,
      input.startDate,
      input.endDate,
      input.lockInMonths,
      input.noticeDays,
      input.extras,
      bodyText,
      now,
    )
  return getAgreement(id)!
}

export function getAgreement(id: string) {
  const row = asRow(getDb().prepare("SELECT * FROM rental_agreements WHERE id = ?").get(id))
  return row ? mapAgreement(row) : null
}

export function agreementsForTenant(tenantId: string) {
  return asRows(
    getDb()
      .prepare(
        "SELECT * FROM rental_agreements WHERE tenant_id = ? ORDER BY created_at DESC",
      )
      .all(tenantId),
  ).map(mapAgreement)
}

export function agreementsForParty(partyNameHint: string) {
  return asRows(
    getDb()
      .prepare(
        `SELECT * FROM rental_agreements
         WHERE tenant_party_name LIKE ? OR landlord_name LIKE ?
         ORDER BY created_at DESC`,
      )
      .all(`%${partyNameHint}%`, `%${partyNameHint}%`),
  ).map(mapAgreement)
}

export function demoSignAgreement(
  id: string,
  mode: "signed_demo" | "aadhaar_esign_demo",
) {
  const existing = getAgreement(id)
  if (!existing) return { ok: false as const, error: "Agreement not found." }
  const requestId =
    mode === "aadhaar_esign_demo" ? `aadhaar_esign_${id.slice(0, 8)}` : null
  getDb()
    .prepare(
      `UPDATE rental_agreements
       SET status = ?, signed_at = ?, esign_request_id = COALESCE(?, esign_request_id)
       WHERE id = ?`,
    )
    .run(mode, new Date().toISOString(), requestId, id)
  return { ok: true as const, agreement: getAgreement(id)! }
}

export function deleteUnitListing(tenantId: string, unitId: string) {
  const row = asRow(
    getDb()
      .prepare("SELECT id, status FROM units WHERE id = ? AND tenant_id = ?")
      .get(unitId, tenantId),
  )
  if (!row) return { ok: false as const, error: "Unit not in this organisation." }
  if (String(row.status) === "leased") {
    return { ok: false as const, error: "Leased units cannot be deleted — delist instead." }
  }
  const apps = asRow(
    getDb()
      .prepare(
        "SELECT COUNT(*) AS c FROM applications WHERE unit_id = ? AND status = 'submitted'",
      )
      .get(unitId),
  )
  if (Number(apps?.c ?? 0) > 0) {
    return {
      ok: false as const,
      error: "Open applications exist — deny them or delist the unit instead of deleting.",
    }
  }
  getDb().prepare("DELETE FROM unit_media WHERE unit_id = ? AND tenant_id = ?").run(unitId, tenantId)
  getDb()
    .prepare("DELETE FROM unit_mesh_bindings WHERE unit_id = ? AND tenant_id = ?")
    .run(unitId, tenantId)
  getDb()
    .prepare("DELETE FROM units WHERE id = ? AND tenant_id = ?")
    .run(unitId, tenantId)
  return { ok: true as const }
}

export function deletePropertyForLandlord(tenantId: string, propertyId: string) {
  const property = asRow(
    getDb()
      .prepare("SELECT id FROM properties WHERE id = ? AND tenant_id = ?")
      .get(propertyId, tenantId),
  )
  if (!property) return { ok: false as const, error: "Property not in this organisation." }
  const leased = asRow(
    getDb()
      .prepare(
        "SELECT COUNT(*) AS c FROM units WHERE property_id = ? AND tenant_id = ? AND status = 'leased'",
      )
      .get(propertyId, tenantId),
  )
  if (Number(leased?.c ?? 0) > 0) {
    return { ok: false as const, error: "A leased bay is on this building — cannot delete." }
  }
  const units = asRows(
    getDb()
      .prepare("SELECT id FROM units WHERE property_id = ? AND tenant_id = ?")
      .all(propertyId, tenantId),
  )
  for (const unit of units) {
    const result = deleteUnitListing(tenantId, String(unit.id))
    if (!result.ok) return result
  }
  getDb()
    .prepare("DELETE FROM floor_map_versions WHERE property_id = ? AND tenant_id = ?")
    .run(propertyId, tenantId)
  getDb()
    .prepare("DELETE FROM unit_mesh_bindings WHERE property_id = ? AND tenant_id = ?")
    .run(propertyId, tenantId)
  getDb()
    .prepare("DELETE FROM floors WHERE property_id = ? AND tenant_id = ?")
    .run(propertyId, tenantId)
  getDb()
    .prepare("DELETE FROM properties WHERE id = ? AND tenant_id = ?")
    .run(propertyId, tenantId)
  return { ok: true as const }
}

export function updateUnitListing(
  tenantId: string,
  unitId: string,
  patch: {
    ratePsf?: number
    description?: string
    listed?: boolean
    matterportUrl?: string | null
    status?: "available" | "pending" | "leased" | "hold"
  },
) {
  const row = asRow(
    getDb()
      .prepare("SELECT id, rate_psf, sqft FROM units WHERE id = ? AND tenant_id = ?")
      .get(unitId, tenantId),
  )
  if (!row) return { ok: false as const, error: "Unit not in this organisation." }
  if (patch.ratePsf != null) {
    getDb()
      .prepare("UPDATE units SET rate_psf = ? WHERE id = ? AND tenant_id = ?")
      .run(patch.ratePsf, unitId, tenantId)
  }
  if (patch.description != null) {
    getDb()
      .prepare("UPDATE units SET description = ? WHERE id = ? AND tenant_id = ?")
      .run(patch.description, unitId, tenantId)
  }
  if (patch.listed != null) {
    getDb()
      .prepare("UPDATE units SET listed = ? WHERE id = ? AND tenant_id = ?")
      .run(patch.listed ? 1 : 0, unitId, tenantId)
  }
  if (patch.matterportUrl !== undefined) {
    getDb()
      .prepare("UPDATE units SET matterport_url = ? WHERE id = ? AND tenant_id = ?")
      .run(patch.matterportUrl, unitId, tenantId)
  }
  if (patch.status != null) {
    getDb()
      .prepare("UPDATE units SET status = ? WHERE id = ? AND tenant_id = ?")
      .run(patch.status, unitId, tenantId)
  }
  const updated = asRow(
    getDb().prepare("SELECT * FROM units WHERE id = ?").get(unitId),
  )!
  return {
    ok: true as const,
    monthlyCents: monthlyRentCents(Number(updated.rate_psf), Number(updated.sqft)),
  }
}

export function createUnitForProperty(input: {
  tenantId: string
  propertyId: string
  code: string
  sqft: number
  clearHeight: string
  docks: number
  driveIns: number
  power: string
  ratePsf: number
  description: string
}) {
  const property = asRow(
    getDb()
      .prepare("SELECT id FROM properties WHERE id = ? AND tenant_id = ?")
      .get(input.propertyId, input.tenantId),
  )
  if (!property) return { ok: false as const, error: "Property not in this organisation." }
  const exists = asRow(
    getDb()
      .prepare("SELECT id FROM units WHERE property_id = ? AND code = ?")
      .get(input.propertyId, input.code),
  )
  if (exists) return { ok: false as const, error: "That unit code already exists." }
  const id = `u_${input.propertyId.replace(/^p_/, "")}_${input.code.toLowerCase()}_${crypto.randomUUID().slice(0, 6)}`
  getDb()
    .prepare(
      `INSERT INTO units (
         id, tenant_id, property_id, floor_id, code, sqft, clear_height, docks, drive_ins,
         power, rate_psf, status, hotspot_x, hotspot_y, matterport_url, description, listed
       ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 'available', NULL, NULL, NULL, ?, 1)`,
    )
    .run(
      id,
      input.tenantId,
      input.propertyId,
      input.code,
      input.sqft,
      input.clearHeight,
      input.docks,
      input.driveIns,
      input.power,
      input.ratePsf,
      input.description,
    )
  return { ok: true as const, unitId: id }
}

/** Active lease = approved application for this user. */
export function activeLeasesForUser(userId: string) {
  return asRows(
    getDb()
      .prepare(
        `SELECT a.id AS application_id, a.tenant_id, t.name AS tenant_name,
                p.id AS property_id, p.name AS property_name, p.slug AS property_slug,
                u.id AS unit_id, u.code AS unit_code
         FROM applications a
         JOIN tenants t ON t.id = a.tenant_id
         JOIN units u ON u.id = a.unit_id
         JOIN properties p ON p.id = u.property_id
         WHERE a.applicant_id = ? AND a.status = 'approved'
         ORDER BY a.created_at DESC`,
      )
      .all(userId),
  ).map((row) => ({
    applicationId: String(row.application_id),
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name),
    propertyId: String(row.property_id),
    propertyName: String(row.property_name),
    propertySlug: String(row.property_slug),
    unitId: String(row.unit_id),
    unitCode: String(row.unit_code),
  }))
}

export function listingRowsForTenant(tenantId: string) {
  return asRows(
    getDb()
      .prepare(
        `SELECT u.id, u.code, u.sqft, u.rate_psf, u.status, u.listed, u.description,
                u.matterport_url, p.id AS property_id, p.name AS property_name, p.area
         FROM units u
         JOIN properties p ON p.id = u.property_id
         WHERE u.tenant_id = ?
         ORDER BY p.name, u.code`,
      )
      .all(tenantId),
  ).map((row) => ({
    id: String(row.id),
    code: String(row.code),
    sqft: Number(row.sqft),
    ratePsf: Number(row.rate_psf),
    status: String(row.status),
    listed: Number(row.listed ?? 1) === 1,
    description: String(row.description),
    matterportUrl: str(row, "matterport_url"),
    propertyId: String(row.property_id),
    propertyName: String(row.property_name),
    area: String(row.area),
    monthlyCents: monthlyRentCents(Number(row.rate_psf), Number(row.sqft)),
  }))
}

export function visitCountsForTenant(tenantId: string) {
  const rows = asRows(
    getDb()
      .prepare(
        `SELECT status, COUNT(*) AS c FROM visit_requests WHERE tenant_id = ? GROUP BY status`,
      )
      .all(tenantId),
  )
  const counts: Record<string, number> = {}
  for (const row of rows) counts[String(row.status)] = Number(row.c)
  return {
    requested: counts.requested ?? counts.pending ?? 0,
    confirmed: counts.confirmed ?? 0,
    declined: counts.declined ?? 0,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
  }
}

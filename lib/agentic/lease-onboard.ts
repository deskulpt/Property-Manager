import "server-only"
import { getDb } from "@/lib/db"
import {
  getRegionPreset,
  parseCountry,
  resolveLawNotes,
  type JurisdictionCountry,
} from "@/lib/agentic/jurisdictions"
import type {
  LeaseAgreement,
  LeaseAgreementStatus,
  LeaseParty,
  LeasePartyRole,
  UpsertLeasePartyPayload,
  UpsertOccupantLedgerPayload,
} from "@/lib/agentic/types"

function asRow(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined
  return { ...(value as object) }
}

function mapParty(row: Record<string, unknown>): LeaseParty {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    unitId: String(row.unit_id),
    leaseId: row.lease_id == null ? null : String(row.lease_id),
    role: String(row.role) as LeasePartyRole,
    name: String(row.name),
    email: String(row.email),
    phone: String(row.phone ?? ""),
    addressLine1: String(row.address_line1 ?? ""),
    addressLine2: String(row.address_line2 ?? ""),
    city: String(row.city ?? ""),
    region: String(row.region ?? ""),
    postalCode: String(row.postal_code ?? ""),
    country: String(row.country ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapAgreement(row: Record<string, unknown>): LeaseAgreement {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    unitId: String(row.unit_id),
    leaseId: row.lease_id == null ? null : String(row.lease_id),
    country: String(row.country),
    region: String(row.region),
    lawNotes: String(row.law_notes ?? ""),
    status: String(row.status) as LeaseAgreementStatus,
    documentHtml: String(row.document_html ?? ""),
    documentJson: String(row.document_json ?? "{}"),
    esignProvider: row.esign_provider == null ? null : String(row.esign_provider),
    esignEnvelopeId: row.esign_envelope_id == null ? null : String(row.esign_envelope_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function unitOwned(tenantId: string, unitId: string) {
  return asRow(
    getDb()
      .prepare(
        `SELECT u.id, u.code, u.status, u.rate_psf, u.sqft, u.description,
                p.id AS property_id, p.name AS property_name, p.address, p.city_line, p.area
         FROM units u
         JOIN properties p ON p.id = u.property_id
         WHERE u.id = ? AND u.tenant_id = ?`,
      )
      .get(unitId, tenantId),
  )
}

/** List unit publicly (status → available). Never notifies applicants. */
export function executeListUnit(input: {
  tenantId: string
  unitId: string
}): { ok: true; unitId: string; status: string } | { ok: false; error: string } {
  const unit = unitOwned(input.tenantId, input.unitId)
  if (!unit) return { ok: false, error: "Unit not found in this organisation." }
  if (String(unit.status) === "leased") {
    return { ok: false, error: "Leased units cannot be re-listed while occupied." }
  }
  getDb()
    .prepare("UPDATE units SET status = 'available' WHERE id = ? AND tenant_id = ?")
    .run(input.unitId, input.tenantId)
  getDb()
    .prepare(
      `UPDATE listing_drafts SET published = 1, updated_at = ?
       WHERE tenant_id = ? AND unit_id = ?`,
    )
    .run(new Date().toISOString(), input.tenantId, input.unitId)
  return { ok: true, unitId: input.unitId, status: "available" }
}

/** Delist from public catalog (status → hold). Never notifies. */
export function executeUnlistUnit(input: {
  tenantId: string
  unitId: string
}): { ok: true; unitId: string; status: string } | { ok: false; error: string } {
  const unit = unitOwned(input.tenantId, input.unitId)
  if (!unit) return { ok: false, error: "Unit not found in this organisation." }
  if (String(unit.status) === "leased") {
    return { ok: false, error: "Leased units stay leased — unlist only applies to open listings." }
  }
  getDb()
    .prepare("UPDATE units SET status = 'hold' WHERE id = ? AND tenant_id = ?")
    .run(input.unitId, input.tenantId)
  getDb()
    .prepare(
      `UPDATE listing_drafts SET published = 0, updated_at = ?
       WHERE tenant_id = ? AND unit_id = ?`,
    )
    .run(new Date().toISOString(), input.tenantId, input.unitId)
  return { ok: true, unitId: input.unitId, status: "hold" }
}

/**
 * Upsert occupant user link + optional rent ledger seed.
 * Money lines only when explicitly approved via proposal execute.
 */
export function executeUpsertOccupantLedger(
  input: UpsertOccupantLedgerPayload & { tenantId: string },
):
  | { ok: true; userId: string; ledgerEntryId: string | null }
  | { ok: false; error: string } {
  const unit = unitOwned(input.tenantId, input.unitId)
  if (!unit) return { ok: false, error: "Unit not found in this organisation." }

  const db = getDb()
  const email = input.email.trim().toLowerCase()
  if (!email || !input.name.trim()) {
    return { ok: false, error: "Occupant name and email are required." }
  }

  let userId = input.userId ?? null
  if (userId) {
    const existing = asRow(
      db.prepare("SELECT id FROM users WHERE id = ?").get(userId),
    )
    if (!existing) return { ok: false, error: "Occupant user not found." }
  } else {
    const byEmail = asRow(
      db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(email),
    )
    if (byEmail) {
      userId = String(byEmail.id)
    } else {
      userId = crypto.randomUUID()
      db.prepare(
        `INSERT INTO users (id, name, email, role, tenant_id, company, trade, service_area, provider_verified, phone)
         VALUES (?, ?, ?, 'applicant', NULL, ?, NULL, NULL, 0, ?)`,
      ).run(userId, input.name.trim(), email, input.company?.trim() || null, input.phone?.trim() || null)
    }
  }

  // Mark unit leased on occupant seed (desk path after approve)
  db.prepare("UPDATE units SET status = 'leased' WHERE id = ? AND tenant_id = ?").run(
    input.unitId,
    input.tenantId,
  )

  let ledgerEntryId: string | null = null
  if (input.seedRentCents && input.seedRentCents > 0) {
    ledgerEntryId = crypto.randomUUID()
    const dueOn = input.dueOn ?? new Date().toISOString().slice(0, 10)
    db.prepare(
      `INSERT INTO ledger_entries
        (id, tenant_id, unit_id, user_id, kind, description, amount_cents, status, due_on, created_at, source_id)
       VALUES (?, ?, ?, ?, 'rent', ?, ?, 'due', ?, ?, ?)`,
    ).run(
      ledgerEntryId,
      input.tenantId,
      input.unitId,
      userId,
      input.description ?? `Ask Easy onboard rent · Unit ${unit.code}`,
      input.seedRentCents,
      dueOn,
      new Date().toISOString(),
      `ask_easy_onboard:${input.unitId}`,
    )
  }

  return { ok: true, userId, ledgerEntryId }
}

export function upsertLeaseParty(
  input: UpsertLeasePartyPayload & { tenantId: string },
): { ok: true; party: LeaseParty } | { ok: false; error: string } {
  const unit = unitOwned(input.tenantId, input.unitId)
  if (!unit) return { ok: false, error: "Unit not found in this organisation." }
  if (!["primary", "secondary", "guarantor"].includes(input.role)) {
    return { ok: false, error: "Role must be primary, secondary, or guarantor." }
  }
  if (!input.name.trim() || !input.email.trim()) {
    return { ok: false, error: "Party name and email are required." }
  }

  const db = getDb()
  const now = new Date().toISOString()
  let id = input.partyId ?? null

  if (id) {
    const existing = asRow(
      db
        .prepare("SELECT id FROM lease_parties WHERE id = ? AND tenant_id = ?")
        .get(id, input.tenantId),
    )
    if (!existing) return { ok: false, error: "Party not found for this organisation." }
    db.prepare(
      `UPDATE lease_parties SET
        unit_id = ?, role = ?, name = ?, email = ?, phone = ?,
        address_line1 = ?, address_line2 = ?, city = ?, region = ?,
        postal_code = ?, country = ?, updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
    ).run(
      input.unitId,
      input.role,
      input.name.trim(),
      input.email.trim().toLowerCase(),
      input.phone?.trim() ?? "",
      input.addressLine1?.trim() ?? "",
      input.addressLine2?.trim() ?? "",
      input.city?.trim() ?? "",
      input.region?.trim() ?? "",
      input.postalCode?.trim() ?? "",
      input.country?.trim() ?? "",
      now,
      id,
      input.tenantId,
    )
  } else {
    // One primary per unit — replace prior primary if re-upserted by role
    if (input.role === "primary") {
      const prior = asRow(
        db
          .prepare(
            `SELECT id FROM lease_parties
             WHERE tenant_id = ? AND unit_id = ? AND role = 'primary' LIMIT 1`,
          )
          .get(input.tenantId, input.unitId),
      )
      if (prior) id = String(prior.id)
    }
    if (id) {
      db.prepare(
        `UPDATE lease_parties SET
          name = ?, email = ?, phone = ?,
          address_line1 = ?, address_line2 = ?, city = ?, region = ?,
          postal_code = ?, country = ?, updated_at = ?
         WHERE id = ? AND tenant_id = ?`,
      ).run(
        input.name.trim(),
        input.email.trim().toLowerCase(),
        input.phone?.trim() ?? "",
        input.addressLine1?.trim() ?? "",
        input.addressLine2?.trim() ?? "",
        input.city?.trim() ?? "",
        input.region?.trim() ?? "",
        input.postalCode?.trim() ?? "",
        input.country?.trim() ?? "",
        now,
        id,
        input.tenantId,
      )
    } else {
      id = crypto.randomUUID()
      db.prepare(
        `INSERT INTO lease_parties
          (id, tenant_id, unit_id, lease_id, role, name, email, phone,
           address_line1, address_line2, city, region, postal_code, country, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        input.tenantId,
        input.unitId,
        input.role,
        input.name.trim(),
        input.email.trim().toLowerCase(),
        input.phone?.trim() ?? "",
        input.addressLine1?.trim() ?? "",
        input.addressLine2?.trim() ?? "",
        input.city?.trim() ?? "",
        input.region?.trim() ?? "",
        input.postalCode?.trim() ?? "",
        input.country?.trim() ?? "",
        now,
        now,
      )
    }
  }

  const party = leasePartyById(input.tenantId, id!)
  if (!party) return { ok: false, error: "Party write failed." }
  return { ok: true, party }
}

export function leasePartyById(tenantId: string, id: string): LeaseParty | null {
  const row = asRow(
    getDb()
      .prepare("SELECT * FROM lease_parties WHERE id = ? AND tenant_id = ?")
      .get(id, tenantId),
  )
  return row ? mapParty(row) : null
}

export function leasePartiesForUnit(tenantId: string, unitId: string): LeaseParty[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM lease_parties WHERE tenant_id = ? AND unit_id = ?
       ORDER BY CASE role WHEN 'primary' THEN 0 WHEN 'secondary' THEN 1 ELSE 2 END, created_at`,
    )
    .all(tenantId, unitId) as Record<string, unknown>[]
  return rows.map((r) => mapParty(asRow(r) ?? r))
}

export function leasePartiesForTenant(tenantId: string): LeaseParty[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM lease_parties WHERE tenant_id = ? ORDER BY updated_at DESC`,
    )
    .all(tenantId) as Record<string, unknown>[]
  return rows.map((r) => mapParty(asRow(r) ?? r))
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildStandardAgreementHtml(input: {
  propertyName: string
  propertyAddress: string
  unitCode: string
  ratePsf: number
  sqft: number
  country: JurisdictionCountry
  region: string
  regionName: string
  lawNotes: string
  parties: LeaseParty[]
}): string {
  const primary = input.parties.filter((p) => p.role === "primary")
  const secondary = input.parties.filter((p) => p.role === "secondary")
  const guarantors = input.parties.filter((p) => p.role === "guarantor")
  const partyBlock = (label: string, list: LeaseParty[]) =>
    list.length === 0
      ? `<p><em>No ${label.toLowerCase()} recorded.</em></p>`
      : `<ul>${list
          .map(
            (p) =>
              `<li><strong>${escapeHtml(p.name)}</strong> &lt;${escapeHtml(p.email)}&gt;` +
              (p.phone ? ` · ${escapeHtml(p.phone)}` : "") +
              (p.addressLine1
                ? `<br/>${escapeHtml([p.addressLine1, p.city, p.region, p.postalCode, p.country].filter(Boolean).join(", "))}`
                : "") +
              `</li>`,
          )
          .join("")}</ul>`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Standard Rental Agreement — Unit ${escapeHtml(input.unitCode)}</title></head>
<body>
  <header>
    <h1>Standard Rental Agreement</h1>
    <p><strong>Easy Rental</strong> demo template · ${escapeHtml(input.country)} / ${escapeHtml(input.regionName)} (${escapeHtml(input.region)})</p>
    <p role="note"><em>This document is a demonstration template and is not legal advice. Have qualified counsel review before signing.</em></p>
  </header>
  <section>
    <h2>1. Premises</h2>
    <p>${escapeHtml(input.propertyName)} — Unit ${escapeHtml(input.unitCode)}<br/>
    ${escapeHtml(input.propertyAddress)}<br/>
    Area: ${input.sqft.toLocaleString()} SF · Indicative rate: ${input.ratePsf}/SF</p>
  </section>
  <section>
    <h2>2. Parties</h2>
    <h3>Primary lease holder</h3>
    ${partyBlock("Primary", primary)}
    <h3>Secondary lease holder(s)</h3>
    ${partyBlock("Secondary", secondary)}
    <h3>Guarantor(s)</h3>
    ${partyBlock("Guarantor", guarantors)}
  </section>
  <section>
    <h2>3. Jurisdiction &amp; applicable law themes</h2>
    <p>Country: <strong>${escapeHtml(input.country)}</strong> · State/Province: <strong>${escapeHtml(input.regionName)}</strong> (${escapeHtml(input.region)})</p>
    <p>${escapeHtml(input.lawNotes)}</p>
  </section>
  <section>
    <h2>4. Term &amp; rent (template)</h2>
    <p>Term, deposit, escalation, and CAM to be completed by the landlord before eSign. Monthly rent is calculated from the listed rate and area unless overridden in an addendum.</p>
  </section>
  <section>
    <h2>5. Signatures</h2>
    <p>Signature blocks will be attached by the eSign provider after landlord approval to send.</p>
  </section>
</body>
</html>`
}

export function draftRentalAgreement(input: {
  tenantId: string
  unitId: string
  country: string
  region: string
  lawNotes?: string | null
}): { ok: true; agreement: LeaseAgreement } | { ok: false; error: string } {
  const unit = unitOwned(input.tenantId, input.unitId)
  if (!unit) return { ok: false, error: "Unit not found in this organisation." }

  const country = parseCountry(input.country)
  if (!country) return { ok: false, error: "Country must be IN (India) or CA (Canada) for this demo." }

  const regionCode = input.region.trim().toUpperCase()
  if (!regionCode) return { ok: false, error: "State/province code is required." }

  const region = getRegionPreset(country, regionCode)
  const regionName = region?.name ?? regionCode
  const lawNotes = (input.lawNotes?.trim() || resolveLawNotes(country, regionCode)).trim()

  const parties = leasePartiesForUnit(input.tenantId, input.unitId)
  if (!parties.some((p) => p.role === "primary")) {
    return {
      ok: false,
      error: "Add a primary lease holder before drafting the rental agreement.",
    }
  }

  const html = buildStandardAgreementHtml({
    propertyName: String(unit.property_name),
    propertyAddress: `${unit.address}, ${unit.city_line}`,
    unitCode: String(unit.code),
    ratePsf: Number(unit.rate_psf),
    sqft: Number(unit.sqft),
    country,
    region: regionCode,
    regionName,
    lawNotes,
    parties,
  })

  const documentJson = JSON.stringify({
    template: "standard_rental_v1",
    country,
    region: regionCode,
    regionName,
    lawNotes,
    unitId: input.unitId,
    propertyId: String(unit.property_id),
    partyIds: parties.map((p) => p.id),
    ratePsf: Number(unit.rate_psf),
    sqft: Number(unit.sqft),
    disclaimer: "not_legal_advice",
  })

  const db = getDb()
  const now = new Date().toISOString()
  const prior = asRow(
    db
      .prepare(
        `SELECT id FROM lease_agreements
         WHERE tenant_id = ? AND unit_id = ? AND status IN ('draft','ready_for_esign')
         ORDER BY updated_at DESC LIMIT 1`,
      )
      .get(input.tenantId, input.unitId),
  )

  let id: string
  if (prior) {
    id = String(prior.id)
    db.prepare(
      `UPDATE lease_agreements SET
        country = ?, region = ?, law_notes = ?, status = 'draft',
        document_html = ?, document_json = ?, updated_at = ?,
        esign_provider = NULL, esign_envelope_id = NULL
       WHERE id = ? AND tenant_id = ?`,
    ).run(country, regionCode, lawNotes, html, documentJson, now, id, input.tenantId)
  } else {
    id = crypto.randomUUID()
    db.prepare(
      `INSERT INTO lease_agreements
        (id, tenant_id, unit_id, lease_id, country, region, law_notes, status,
         document_html, document_json, esign_provider, esign_envelope_id, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, 'draft', ?, ?, NULL, NULL, ?, ?)`,
    ).run(id, input.tenantId, input.unitId, country, regionCode, lawNotes, html, documentJson, now, now)
  }

  const agreement = leaseAgreementById(input.tenantId, id)
  if (!agreement) return { ok: false, error: "Agreement write failed." }
  return { ok: true, agreement }
}

export function leaseAgreementById(tenantId: string, id: string): LeaseAgreement | null {
  const row = asRow(
    getDb()
      .prepare("SELECT * FROM lease_agreements WHERE id = ? AND tenant_id = ?")
      .get(id, tenantId),
  )
  return row ? mapAgreement(row) : null
}

export function leaseAgreementsForTenant(tenantId: string): LeaseAgreement[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM lease_agreements WHERE tenant_id = ? ORDER BY updated_at DESC`,
    )
    .all(tenantId) as Record<string, unknown>[]
  return rows.map((r) => mapAgreement(asRow(r) ?? r))
}

export function markAgreementStatus(
  tenantId: string,
  agreementId: string,
  patch: {
    status: LeaseAgreementStatus
    esignProvider?: string | null
    esignEnvelopeId?: string | null
  },
): LeaseAgreement | null {
  const existing = leaseAgreementById(tenantId, agreementId)
  if (!existing) return null
  getDb()
    .prepare(
      `UPDATE lease_agreements
       SET status = ?, esign_provider = ?, esign_envelope_id = ?, updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
    )
    .run(
      patch.status,
      patch.esignProvider ?? existing.esignProvider,
      patch.esignEnvelopeId ?? existing.esignEnvelopeId,
      new Date().toISOString(),
      agreementId,
      tenantId,
    )
  return leaseAgreementById(tenantId, agreementId)
}

/** Heuristic extractors for stub onboard prompts. */
export function extractOnboardHints(prompt: string): {
  country?: JurisdictionCountry
  region?: string
  role?: LeasePartyRole
  email?: string
  name?: string
  phone?: string
} {
  const lower = prompt.toLowerCase()
  const out: ReturnType<typeof extractOnboardHints> = {}

  if (/\b(india|🇮🇳|\bin\b)/i.test(prompt) || lower.includes("maharashtra") || lower.includes("karnataka")) {
    out.country = "IN"
  }
  if (/\b(canada|🇨🇦|\bca\b)/i.test(prompt) || lower.includes("ontario") || lower.includes("british columbia")) {
    out.country = "CA"
  }

  const regionMatch = prompt.match(
    /\b(MH|KA|TN|GJ|DL|TG|ON|BC|AB|QC|NS|MB|Maharashtra|Karnataka|Tamil Nadu|Gujarat|Delhi|Telangana|Ontario|British Columbia|Alberta|Quebec|Nova Scotia|Manitoba)\b/i,
  )
  if (regionMatch) {
    const raw = regionMatch[1]
    const map: Record<string, string> = {
      maharashtra: "MH",
      karnataka: "KA",
      "tamil nadu": "TN",
      gujarat: "GJ",
      delhi: "DL",
      telangana: "TG",
      ontario: "ON",
      "british columbia": "BC",
      alberta: "AB",
      quebec: "QC",
      "nova scotia": "NS",
      manitoba: "MB",
    }
    out.region = map[raw.toLowerCase()] ?? raw.toUpperCase()
  }

  if (/\bguarantor\b/i.test(prompt)) out.role = "guarantor"
  else if (/\bsecondary\b/i.test(prompt)) out.role = "secondary"
  else if (/\bprimary\b/i.test(prompt) || /\btenant\b|\blease holder\b|\boccupant\b/i.test(prompt)) {
    out.role = "primary"
  }

  const email = prompt.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  if (email) out.email = email[0]

  const phone = prompt.match(/(\+?\d[\d\s-]{8,}\d)/)
  if (phone) out.phone = phone[1].replace(/\s+/g, " ").trim()

  const nameMatch = prompt.match(
    /(?:named?|called|is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
  )
  if (nameMatch) out.name = nameMatch[1]

  return out
}

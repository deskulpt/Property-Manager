import "server-only"
import { getDb } from "@/lib/db"
import type { AgentMemoryEntry, AgentMemoryKind } from "@/lib/agentic/types"

/**
 * Slice L.1 — durable Ask Easy memory (per-landlord / per-property).
 * DPDP: never store Aadhaar images, raw Aadhaar numbers, biometrics, or full card numbers.
 * Retention: 24 months rolling (PRD #37); landlord may purge anytime.
 */

export const MEMORY_RETENTION_MS = 24 * 30 * 24 * 60 * 60 * 1000

export const MEMORY_KINDS: readonly AgentMemoryKind[] = [
  "issue",
  "complaint_theme",
  "preferred_vendor",
  "tone_pref",
  "escalation_note",
  "dock_quirk",
  "job_outcome",
  "other",
] as const

const KIND_SET = new Set<string>(MEMORY_KINDS)

function asRow(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined
  return { ...(value as object) }
}

function mapMemory(row: Record<string, unknown>): AgentMemoryEntry {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    propertyId: row.property_id == null ? null : String(row.property_id),
    kind: String(row.kind) as AgentMemoryKind,
    title: String(row.title),
    body: String(row.body),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    createdBy: row.created_by == null ? null : String(row.created_by),
  }
}

/** Reject KYC / payment secrets before any write (DPDP + PRD §21.4). */
export function assertMemoryContentAllowed(input: {
  title: string
  body: string
  kind?: string
}): { ok: true } | { ok: false; error: string } {
  const text = `${input.title} ${input.body}`
  const blob = `${input.kind ?? ""} ${text}`.toLowerCase()

  if (/\b(aadhaar|aadhar|uidai)\b/.test(blob) && /\b(image|photo|scan|upload|pdf|jpg|jpeg|png|webp)\b/.test(blob)) {
    return {
      ok: false,
      error:
        "DPDP: Ask Easy memory cannot store Aadhaar images or ID scans. Use a licensed KYC provider reference only.",
    }
  }
  if (/\b(biometric|fingerprint|iris|face.?template|face.?scan)\b/.test(blob)) {
    return { ok: false, error: "DPDP: biometric material is forbidden in Ask Easy memory." }
  }
  // Raw Aadhaar: XXXX XXXX XXXX (spaces/hyphens optional)
  if (/(?:^|[^\d])\d{4}[\s-]?\d{4}[\s-]?\d{4}(?:[^\d]|$)/.test(text)) {
    return {
      ok: false,
      error: "DPDP: raw Aadhaar numbers are forbidden in Ask Easy memory.",
    }
  }
  if (/data:image\//i.test(text)) {
    return { ok: false, error: "DPDP: image data URIs are forbidden in Ask Easy memory." }
  }
  // Full payment card (13–19 digits, optional grouping)
  const cardMatch = text.match(/(?:^|[^\d])((?:\d[\s-]?){12,18}\d)(?:[^\d]|$)/)
  if (cardMatch) {
    const digitsOnly = cardMatch[1].replace(/\D/g, "")
    if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
      return { ok: false, error: "Full card numbers are forbidden in Ask Easy memory." }
    }
  }
  if (/\b(cvv|cvc)\b/.test(blob) && /\b\d{3,4}\b/.test(blob)) {
    return { ok: false, error: "Payment secrets are forbidden in Ask Easy memory." }
  }
  return { ok: true }
}

export function normalizeMemoryKind(raw: unknown): AgentMemoryKind {
  const k = String(raw ?? "other").trim().toLowerCase()
  return KIND_SET.has(k) ? (k as AgentMemoryKind) : "other"
}

export type UpsertMemoryInput = {
  tenantId: string
  propertyId?: string | null
  kind: AgentMemoryKind | string
  title: string
  body: string
  createdBy?: string | null
  /** When set, update that row (must belong to tenant). */
  id?: string | null
}

export function upsertAgentMemory(
  input: UpsertMemoryInput,
): { ok: true; entry: AgentMemoryEntry } | { ok: false; error: string } {
  const title = input.title.trim().slice(0, 200)
  const body = input.body.trim().slice(0, 4000)
  if (!title) return { ok: false, error: "Memory needs a short title." }
  if (!body) return { ok: false, error: "Memory needs a body." }

  const kind = normalizeMemoryKind(input.kind)
  const allowed = assertMemoryContentAllowed({ title, body, kind })
  if (!allowed.ok) return allowed

  if (input.propertyId) {
    const prop = getDb()
      .prepare("SELECT id FROM properties WHERE id = ? AND tenant_id = ?")
      .get(input.propertyId, input.tenantId) as { id: string } | undefined
    if (!prop) return { ok: false, error: "Property not in your organisation." }
  }

  const now = new Date().toISOString()
  const db = getDb()

  if (input.id) {
    const existing = db
      .prepare("SELECT * FROM agent_memory WHERE id = ? AND tenant_id = ?")
      .get(input.id, input.tenantId) as Record<string, unknown> | undefined
    if (!existing) return { ok: false, error: "Memory entry not found." }
    db.prepare(
      `UPDATE agent_memory
       SET property_id = ?, kind = ?, title = ?, body = ?, updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
    ).run(
      input.propertyId ?? null,
      kind,
      title,
      body,
      now,
      input.id,
      input.tenantId,
    )
    const row = db
      .prepare("SELECT * FROM agent_memory WHERE id = ?")
      .get(input.id) as Record<string, unknown>
    return { ok: true, entry: mapMemory(asRow(row) ?? row) }
  }

  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO agent_memory
      (id, tenant_id, property_id, kind, title, body, created_at, updated_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.tenantId,
    input.propertyId ?? null,
    kind,
    title,
    body,
    now,
    now,
    input.createdBy ?? null,
  )
  const row = db.prepare("SELECT * FROM agent_memory WHERE id = ?").get(id) as Record<string, unknown>
  return { ok: true, entry: mapMemory(asRow(row) ?? row) }
}

export function listAgentMemory(
  tenantId: string,
  opts?: { propertyId?: string | null; includeLandlordScope?: boolean; limit?: number },
): AgentMemoryEntry[] {
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500)
  const propertyId = opts?.propertyId
  const includeLandlord = opts?.includeLandlordScope !== false
  const db = getDb()

  let rows: Record<string, unknown>[]
  if (propertyId) {
    if (includeLandlord) {
      rows = db
        .prepare(
          `SELECT * FROM agent_memory
           WHERE tenant_id = ?
             AND (property_id IS NULL OR property_id = ?)
           ORDER BY updated_at DESC
           LIMIT ?`,
        )
        .all(tenantId, propertyId, limit) as Record<string, unknown>[]
    } else {
      rows = db
        .prepare(
          `SELECT * FROM agent_memory
           WHERE tenant_id = ? AND property_id = ?
           ORDER BY updated_at DESC
           LIMIT ?`,
        )
        .all(tenantId, propertyId, limit) as Record<string, unknown>[]
    }
  } else {
    rows = db
      .prepare(
        `SELECT * FROM agent_memory
         WHERE tenant_id = ?
         ORDER BY updated_at DESC
         LIMIT ?`,
      )
      .all(tenantId, limit) as Record<string, unknown>[]
  }
  return rows.map((row) => mapMemory(asRow(row) ?? row))
}

export type PurgeMemoryScope =
  | { mode: "id"; id: string }
  | { mode: "property"; propertyId: string }
  | { mode: "landlord" }
  | { mode: "all" }

export function purgeAgentMemory(
  tenantId: string,
  scope: PurgeMemoryScope,
): { ok: true; deleted: number } | { ok: false; error: string } {
  const db = getDb()
  let result: { changes: number }

  if (scope.mode === "id") {
    result = db
      .prepare("DELETE FROM agent_memory WHERE id = ? AND tenant_id = ?")
      .run(scope.id, tenantId)
  } else if (scope.mode === "property") {
    const prop = db
      .prepare("SELECT id FROM properties WHERE id = ? AND tenant_id = ?")
      .get(scope.propertyId, tenantId) as { id: string } | undefined
    if (!prop) return { ok: false, error: "Property not in your organisation." }
    result = db
      .prepare("DELETE FROM agent_memory WHERE tenant_id = ? AND property_id = ?")
      .run(tenantId, scope.propertyId)
  } else if (scope.mode === "landlord") {
    result = db
      .prepare("DELETE FROM agent_memory WHERE tenant_id = ? AND property_id IS NULL")
      .run(tenantId)
  } else {
    result = db.prepare("DELETE FROM agent_memory WHERE tenant_id = ?").run(tenantId)
  }

  return { ok: true, deleted: result.changes }
}

/** Drop rows older than retention window (24 months). Tenant-scoped. */
export function purgeExpiredAgentMemory(tenantId: string, now = Date.now()): number {
  const cutoff = new Date(now - MEMORY_RETENTION_MS).toISOString()
  const result = getDb()
    .prepare("DELETE FROM agent_memory WHERE tenant_id = ? AND updated_at < ?")
    .run(tenantId, cutoff)
  return result.changes
}

/** Heuristic extract from landlord prompt for stub remember. */
export function extractMemoryFromPrompt(prompt: string): {
  kind: AgentMemoryKind
  title: string
  body: string
} | null {
  const trimmed = prompt.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()

  let kind: AgentMemoryKind = "other"
  if (/\b(prefer(red)?|favourite|favorite)\b/.test(lower) && /\b(vendor|plumber|electrician|provider)\b/.test(lower)) {
    kind = "preferred_vendor"
  } else if (/\b(complaint|theme|recurring complaint)\b/.test(lower)) {
    kind = "complaint_theme"
  } else if (/\b(dock|quirk|drive.?in)\b/.test(lower)) {
    kind = "dock_quirk"
  } else if (/\b(escalat|urgent|after.?hours)\b/.test(lower)) {
    kind = "escalation_note"
  } else if (/\b(tone|voice|formal|casual)\b/.test(lower)) {
    kind = "tone_pref"
  } else if (/\b(job outcome|fixed|resolved)\b/.test(lower)) {
    kind = "job_outcome"
  } else if (/\b(issue|leak|seal|problem|recurring)\b/.test(lower)) {
    kind = "issue"
  } else if (!/\b(remember|note|memor(y|ise|ize)|save (this|that)|don't forget|do not forget)\b/.test(lower)) {
    return null
  }

  const title =
    kind === "preferred_vendor"
      ? "Preferred vendor"
      : kind === "complaint_theme"
        ? "Complaint theme"
        : kind === "dock_quirk"
          ? "Dock quirk"
          : kind === "escalation_note"
            ? "Escalation note"
            : kind === "tone_pref"
              ? "Tone preference"
              : kind === "job_outcome"
                ? "Job outcome"
                : kind === "issue"
                  ? "Recurring issue"
                  : "Landlord note"

  return { kind, title, body: trimmed.slice(0, 4000) }
}

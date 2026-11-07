/**
 * Ontario Standard Lease + LTB N-forms — human review required; no automated eviction.
 */
import "server-only"
import { getDb } from "@/lib/db"
import {
  isOfficialOntarioLtbForm,
  isOntarioMarket,
  ONTARIO_AUTOMATED_EVICTION_ALLOWED,
  ONTARIO_LTB_N_FORMS,
  ONTARIO_STANDARD_LEASE_TEMPLATE_ID,
  type OntarioLtbFormId,
} from "@/lib/markets/ontario-rta"

export type OntarioFormDraft = {
  id: string
  tenantId: string
  formKind: "standard_lease" | "ltb_n_form"
  formId: string
  unitId: string | null
  payloadJson: string
  humanReviewStatus: "pending" | "approved" | "rejected"
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

let schemaReadyFor: string | null = null

export function ensureOntarioFormsSchema() {
  const dbPath = process.env.DESKULPT_DB_PATH ?? ":memory:"
  if (schemaReadyFor === dbPath) return
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS ontario_form_drafts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      form_kind TEXT NOT NULL,
      form_id TEXT NOT NULL,
      unit_id TEXT,
      payload_json TEXT NOT NULL,
      human_review_status TEXT NOT NULL,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ontario_forms_tenant
      ON ontario_form_drafts(tenant_id, human_review_status, updated_at);
  `)
  schemaReadyFor = dbPath
}

function mapDraft(row: Record<string, unknown>): OntarioFormDraft {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    formKind: String(row.form_kind) as OntarioFormDraft["formKind"],
    formId: String(row.form_id),
    unitId: row.unit_id == null ? null : String(row.unit_id),
    payloadJson: String(row.payload_json),
    humanReviewStatus: String(row.human_review_status) as OntarioFormDraft["humanReviewStatus"],
    reviewedBy: row.reviewed_by == null ? null : String(row.reviewed_by),
    reviewedAt: row.reviewed_at == null ? null : String(row.reviewed_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function listOntarioLtbForms() {
  return ONTARIO_LTB_N_FORMS
}

export function createOntarioFormDraft(input: {
  tenantId: string
  countryIso: string | null | undefined
  formKind: "standard_lease" | "ltb_n_form"
  formId: string
  unitId?: string | null
  payload?: Record<string, unknown>
}): { ok: true; draft: OntarioFormDraft } | { ok: false; error: string; code: string } {
  ensureOntarioFormsSchema()
  if (!isOntarioMarket(input.countryIso)) {
    return { ok: false, code: "not_ontario", error: "Ontario forms apply to CA / Ontario only." }
  }
  if (input.formKind === "standard_lease") {
    if (input.formId !== ONTARIO_STANDARD_LEASE_TEMPLATE_ID) {
      return {
        ok: false,
        code: "ontario_lease_template",
        error: "Ontario residential leases must use the Ontario Standard Lease template.",
      }
    }
  } else {
    if (!isOfficialOntarioLtbForm(input.formId)) {
      return {
        ok: false,
        code: "ontario_ltb_form",
        error: "Only official LTB N-forms are allowed for Ontario notices.",
      }
    }
  }
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  getDb()
    .prepare(
      `INSERT INTO ontario_form_drafts
        (id, tenant_id, form_kind, form_id, unit_id, payload_json, human_review_status,
         reviewed_by, reviewed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, ?)`,
    )
    .run(
      id,
      input.tenantId,
      input.formKind,
      input.formKind === "ltb_n_form" ? input.formId.toUpperCase() : input.formId,
      input.unitId ?? null,
      JSON.stringify(input.payload ?? {}),
      now,
      now,
    )
  const draft = getOntarioFormDraft(input.tenantId, id)
  if (!draft) return { ok: false, code: "write_failed", error: "Form draft write failed." }
  return { ok: true, draft }
}

export function getOntarioFormDraft(tenantId: string, id: string): OntarioFormDraft | null {
  ensureOntarioFormsSchema()
  const row = getDb()
    .prepare("SELECT * FROM ontario_form_drafts WHERE id = ? AND tenant_id = ?")
    .get(id, tenantId) as Record<string, unknown> | undefined
  return row ? mapDraft(row) : null
}

/** Latest Standard Lease / LTB draft for a unit (preferred: approved, else newest). */
export function latestOntarioFormDraftForUnit(
  tenantId: string,
  unitId: string,
  formKind: "standard_lease" | "ltb_n_form" = "standard_lease",
): OntarioFormDraft | null {
  ensureOntarioFormsSchema()
  const approved = getDb()
    .prepare(
      `SELECT * FROM ontario_form_drafts
       WHERE tenant_id = ? AND unit_id = ? AND form_kind = ? AND human_review_status = 'approved'
       ORDER BY reviewed_at DESC LIMIT 1`,
    )
    .get(tenantId, unitId, formKind) as Record<string, unknown> | undefined
  if (approved) return mapDraft(approved)
  const any = getDb()
    .prepare(
      `SELECT * FROM ontario_form_drafts
       WHERE tenant_id = ? AND unit_id = ? AND form_kind = ?
       ORDER BY updated_at DESC LIMIT 1`,
    )
    .get(tenantId, unitId, formKind) as Record<string, unknown> | undefined
  return any ? mapDraft(any) : null
}

export function reviewOntarioFormDraft(input: {
  tenantId: string
  draftId: string
  reviewerUserId: string
  decision: "approved" | "rejected"
}): { ok: true; draft: OntarioFormDraft } | { ok: false; error: string; code: string } {
  ensureOntarioFormsSchema()
  const existing = getOntarioFormDraft(input.tenantId, input.draftId)
  if (!existing) return { ok: false, code: "not_found", error: "Form draft not found." }
  if (existing.humanReviewStatus !== "pending") {
    return { ok: false, code: "already_reviewed", error: "Form draft already reviewed." }
  }
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `UPDATE ontario_form_drafts
       SET human_review_status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
    )
    .run(input.decision, input.reviewerUserId, now, now, input.draftId, input.tenantId)
  const draft = getOntarioFormDraft(input.tenantId, input.draftId)
  if (!draft) return { ok: false, code: "write_failed", error: "Review update failed." }
  return { ok: true, draft }
}

/** Send gate — human review must be approved; eviction automation never allowed. */
export function assertOntarioFormSendAllowed(input: {
  countryIso: string | null | undefined
  draft: OntarioFormDraft | null
  intent?: "send" | "evict_auto"
}): { ok: true } | { ok: false; error: string; code: string } {
  if (!isOntarioMarket(input.countryIso)) return { ok: true }
  if (input.intent === "evict_auto" || ONTARIO_AUTOMATED_EVICTION_ALLOWED) {
    return {
      ok: false,
      code: "ontario_no_auto_eviction",
      error:
        "Automated eviction is permanently OFF for Ontario. Use official LTB N-forms with human review.",
    }
  }
  if (!input.draft) {
    return { ok: false, code: "ontario_form_required", error: "Ontario form draft required before send." }
  }
  if (input.draft.humanReviewStatus !== "approved") {
    return {
      ok: false,
      code: "ontario_human_review_required",
      error: "Human review must approve the Ontario form before send.",
    }
  }
  if (input.draft.formKind === "ltb_n_form" && !isOfficialOntarioLtbForm(input.draft.formId)) {
    return { ok: false, code: "ontario_ltb_form", error: "Only official LTB N-forms may be sent." }
  }
  if (
    input.draft.formKind === "standard_lease" &&
    input.draft.formId !== ONTARIO_STANDARD_LEASE_TEMPLATE_ID
  ) {
    return {
      ok: false,
      code: "ontario_lease_template",
      error: "Only the Ontario Standard Lease template may be sent.",
    }
  }
  return { ok: true }
}

export function assertOntarioAutomatedEvictionBlocked(
  iso: string | null | undefined,
): { ok: true } | { ok: false; error: string; code: string } {
  if (!isOntarioMarket(iso)) return { ok: true }
  return {
    ok: false,
    code: "ontario_no_auto_eviction",
    error: "Automated eviction is permanently OFF for Ontario residential tenancies.",
  }
}

export type { OntarioLtbFormId }

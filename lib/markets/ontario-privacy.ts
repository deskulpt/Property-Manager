/**
 * PIPEDA / CASL surfaces for Ontario (CA) demo/staging.
 * Synthetic data only — never send real PII to AI/MCP while realPii flag OFF.
 */
import "server-only"
import { getDb } from "@/lib/db"
import { isOntarioMarket } from "@/lib/markets/ontario-rta"

/** Breach register retention — PIPEDA guidance: keep 24 months. */
export const ONTARIO_BREACH_RETENTION_MONTHS = 24

/** Default retention for inactive tenant/applicant PII (demo policy). */
export const ONTARIO_DEFAULT_RETENTION_MONTHS = 24

export type OntarioPrivacyLead = {
  tenantId: string
  name: string
  email: string
  updatedAt: string
  updatedBy: string | null
}

export type OntarioBreachRecord = {
  id: string
  tenantId: string
  summary: string
  discoveredAt: string
  recordedAt: string
  recordedBy: string | null
  /** Synthetic demo flag — real incidents need counsel path. */
  synthetic: boolean
}

export type CaslMarketingConsent = {
  id: string
  email: string
  userId: string | null
  granted: boolean
  purpose: "casl_marketing"
  version: string
  createdAt: string
}

const PRIVACY_LEAD_META = (tenantId: string) => `ontario.privacy_lead.${tenantId}`

let schemaReadyFor: string | null = null

export function ensureOntarioPrivacySchema() {
  const dbPath = process.env.DESKULPT_DB_PATH ?? ":memory:"
  if (schemaReadyFor === dbPath) return
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS ontario_breach_register (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      discovered_at TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      recorded_by TEXT,
      synthetic INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_ontario_breach_tenant
      ON ontario_breach_register(tenant_id, recorded_at);
    CREATE TABLE IF NOT EXISTS ontario_retention_rules (
      tenant_id TEXT PRIMARY KEY,
      retention_months INTEGER NOT NULL,
      deletion_policy TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );
  `)
  schemaReadyFor = dbPath
}

function getMeta(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    | { value?: string }
    | undefined
  return row?.value == null ? null : String(row.value)
}

function setMeta(key: string, value: string) {
  getDb()
    .prepare(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value)
}

export function getOntarioPrivacyLead(tenantId: string): OntarioPrivacyLead | null {
  ensureOntarioPrivacySchema()
  const raw = getMeta(PRIVACY_LEAD_META(tenantId))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as OntarioPrivacyLead
    if (!parsed?.email || !parsed?.name) return null
    return parsed
  } catch {
    return null
  }
}

export function setOntarioPrivacyLead(input: {
  tenantId: string
  name: string
  email: string
  updatedBy?: string | null
  countryIso?: string | null
}): { ok: true; lead: OntarioPrivacyLead } | { ok: false; error: string; code: string } {
  ensureOntarioPrivacySchema()
  if (!isOntarioMarket(input.countryIso ?? "CA")) {
    return { ok: false, code: "not_ontario", error: "Privacy lead field applies to Ontario (CA) orgs." }
  }
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (name.length < 2) {
    return { ok: false, code: "privacy_lead_name", error: "Privacy lead name is required." }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, code: "privacy_lead_email", error: "Privacy lead email is invalid." }
  }
  const lead: OntarioPrivacyLead = {
    tenantId: input.tenantId,
    name,
    email,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy ?? null,
  }
  setMeta(PRIVACY_LEAD_META(input.tenantId), JSON.stringify(lead))
  return { ok: true, lead }
}

export function getOntarioRetentionRule(tenantId: string): {
  retentionMonths: number
  deletionPolicy: string
  updatedAt: string | null
} {
  ensureOntarioPrivacySchema()
  const row = getDb()
    .prepare("SELECT * FROM ontario_retention_rules WHERE tenant_id = ?")
    .get(tenantId) as Record<string, unknown> | undefined
  if (!row) {
    return {
      retentionMonths: ONTARIO_DEFAULT_RETENTION_MONTHS,
      deletionPolicy:
        "Delete or anonymize inactive applicant/tenant PII after retention window unless a legal hold applies. Demo/staging uses synthetic data only.",
      updatedAt: null,
    }
  }
  return {
    retentionMonths: Number(row.retention_months),
    deletionPolicy: String(row.deletion_policy),
    updatedAt: String(row.updated_at),
  }
}

export function setOntarioRetentionRule(input: {
  tenantId: string
  retentionMonths: number
  deletionPolicy: string
  updatedBy?: string | null
}): { ok: true } | { ok: false; error: string; code: string } {
  ensureOntarioPrivacySchema()
  if (!Number.isFinite(input.retentionMonths) || input.retentionMonths < 1) {
    return { ok: false, code: "retention_months", error: "Retention months must be ≥ 1." }
  }
  const policy = input.deletionPolicy.trim()
  if (policy.length < 8) {
    return { ok: false, code: "deletion_policy", error: "Deletion policy text is required." }
  }
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO ontario_retention_rules (tenant_id, retention_months, deletion_policy, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id) DO UPDATE SET
         retention_months = excluded.retention_months,
         deletion_policy = excluded.deletion_policy,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
    .run(input.tenantId, input.retentionMonths, policy, now, input.updatedBy ?? null)
  return { ok: true }
}

export function recordOntarioBreach(input: {
  tenantId: string
  summary: string
  discoveredAt: string
  recordedBy?: string | null
  synthetic?: boolean
}): { ok: true; record: OntarioBreachRecord } | { ok: false; error: string; code: string } {
  ensureOntarioPrivacySchema()
  const summary = input.summary.trim()
  if (summary.length < 8) {
    return { ok: false, code: "breach_summary", error: "Breach summary is required." }
  }
  const discoveredAt = input.discoveredAt.trim() || new Date().toISOString()
  const recordedAt = new Date().toISOString()
  const id = crypto.randomUUID()
  const synthetic = input.synthetic !== false
  getDb()
    .prepare(
      `INSERT INTO ontario_breach_register
        (id, tenant_id, summary, discovered_at, recorded_at, recorded_by, synthetic)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.tenantId,
      summary,
      discoveredAt,
      recordedAt,
      input.recordedBy ?? null,
      synthetic ? 1 : 0,
    )
  return {
    ok: true,
    record: {
      id,
      tenantId: input.tenantId,
      summary,
      discoveredAt,
      recordedAt,
      recordedBy: input.recordedBy ?? null,
      synthetic,
    },
  }
}

/** List breaches still inside the 24-month retention window. */
export function listOntarioBreaches(tenantId: string, now = new Date()): OntarioBreachRecord[] {
  ensureOntarioPrivacySchema()
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - ONTARIO_BREACH_RETENTION_MONTHS)
  const cutoffIso = cutoff.toISOString()
  const rows = getDb()
    .prepare(
      `SELECT * FROM ontario_breach_register
       WHERE tenant_id = ? AND recorded_at >= ?
       ORDER BY recorded_at DESC`,
    )
    .all(tenantId, cutoffIso) as Record<string, unknown>[]
  return rows.map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    summary: String(row.summary),
    discoveredAt: String(row.discovered_at),
    recordedAt: String(row.recorded_at),
    recordedBy: row.recorded_by == null ? null : String(row.recorded_by),
    synthetic: Number(row.synthetic) === 1,
  }))
}

export function recordCaslMarketingConsent(input: {
  email: string
  userId?: string | null
  granted: boolean
  version?: string
}): CaslMarketingConsent {
  ensureOntarioPrivacySchema()
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const version = input.version ?? "casl-demo-v1"
  const email = input.email.trim().toLowerCase()
  getDb()
    .prepare(
      `INSERT INTO consent_events (id, user_id, email, purpose, version, granted, created_at, ip_hint)
       VALUES (?, ?, ?, 'casl_marketing', ?, ?, ?, NULL)`,
    )
    .run(id, input.userId ?? null, email, version, input.granted ? 1 : 0, createdAt)
  return {
    id,
    email,
    userId: input.userId ?? null,
    granted: input.granted,
    purpose: "casl_marketing",
    version,
    createdAt,
  }
}

export function hasCaslMarketingConsent(email: string): boolean {
  ensureOntarioPrivacySchema()
  const row = getDb()
    .prepare(
      `SELECT granted FROM consent_events
       WHERE lower(email) = lower(?) AND purpose = 'casl_marketing'
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(email.trim()) as { granted?: number } | undefined
  return Number(row?.granted ?? 0) === 1
}

/** Marketing send gate — CASL consent required for CA marketing. */
export function assertCaslMarketingAllowed(input: {
  iso: string | null | undefined
  email: string
}): { ok: true } | { ok: false; error: string; code: string } {
  if (!isOntarioMarket(input.iso)) return { ok: true }
  if (!hasCaslMarketingConsent(input.email)) {
    return {
      ok: false,
      code: "casl_consent_required",
      error: "CASL consent required before marketing messages to this address.",
    }
  }
  return { ok: true }
}

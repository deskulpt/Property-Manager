import "server-only"
/**
 * Wire meta-table LEGAL overrides for Admin compliance toggles (ER-47).
 * Safe to call repeatedly from layout / enforce.
 *
 * Money enables: dual-control (no self-approval). Host rails `in-pay` / `ca-pay`
 * live in meta `compliance.pay_plane.*` (not CountryPack keys).
 */
import { createHash, createHmac } from "node:crypto"
import { getDb } from "@/lib/db"
import {
  catalogEntryFor,
  COMPLIANCE_CATALOG,
  isPayPlaneFlagId,
  PAY_PLANE_COUNTRY,
  PAY_PLANE_ENV_KEYS,
  PAY_PLANE_FLAG_IDS,
  PAY_PLANE_HOSTS,
  payPlaneMetaKey,
  type PayPlaneFlagId,
} from "@/lib/markets/compliance-catalog"
import {
  LEGAL_OVERRIDE_META_PREFIX,
  clearLegalFlagOverride,
  legalOverrideMetaKey,
  listComplianceFlagRows,
  setLegalFlagOverride,
} from "@/lib/markets/compliance-contract"
import { dataResidencyDeclarative } from "@/lib/markets/enforce"
import {
  LEGAL_FEATURE_FLAG_KEYS,
  registerLegalFlagOverrideReader,
  type LegalFeatureFlagKey,
} from "@/lib/markets/legal-flags"
import { getMetaValue, setMetaValue } from "@/lib/platform-ops"

let registered = false
/** Tracks DESKULPT_DB_PATH so temp-db beforeEach recreates schema on a new file. */
let schemaDbPath: string | null = null

export function ensureLegalFlagOverridesRegistered() {
  if (registered) return
  registerLegalFlagOverrideReader((iso, key) => {
    const raw = getMetaValue(legalOverrideMetaKey(iso, key))
    if (raw == null || raw === "") return null
    return raw === "1" || raw === "true" || raw === "on"
  })
  registered = true
}

function ensureComplianceAuditSchema() {
  ensureLegalFlagOverridesRegistered()
  const dbPath = process.env.DESKULPT_DB_PATH ?? ":memory:"
  if (schemaDbPath === dbPath) return
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS compliance_audit_events (
      id TEXT PRIMARY KEY,
      iso TEXT NOT NULL,
      flag_key TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_user_id TEXT,
      peer_user_id TEXT,
      summary TEXT NOT NULL,
      detail_json TEXT,
      binding_hash TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_compliance_audit_iso
      ON compliance_audit_events(iso, created_at);
    CREATE TABLE IF NOT EXISTS compliance_flag_proposals (
      id TEXT PRIMARY KEY,
      iso TEXT NOT NULL,
      flag_key TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      status TEXT NOT NULL,
      binding_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolved_by TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_compliance_proposals_open
      ON compliance_flag_proposals(iso, flag_key, status);
  `)
  for (const id of PAY_PLANE_FLAG_IDS) {
    if (getMetaValue(payPlaneMetaKey(id)) == null) {
      setMetaValue(payPlaneMetaKey(id), "0")
    }
  }
  schemaDbPath = dbPath
}

function bindingHash(payload: {
  iso: string
  flagKey: string
  requestedBy: string
  createdAt: string
}): string {
  const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex")
  const key = process.env.DESKULPT_SECRET_KEY?.trim()
  if (key && key.length >= 16) {
    return createHmac("sha256", key).update(`v1:compliance-bind:${digest}`).digest("hex")
  }
  return `sha256:${digest}`
}

function writeAudit(input: {
  iso: string
  flagKey: string
  action: string
  summary: string
  actorUserId?: string | null
  peerUserId?: string | null
  detail?: unknown
  bindingHash?: string | null
}) {
  ensureComplianceAuditSchema()
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO compliance_audit_events
        (id, iso, flag_key, action, actor_user_id, peer_user_id, summary, detail_json, binding_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.iso.toUpperCase(),
      input.flagKey,
      input.action,
      input.actorUserId ?? null,
      input.peerUserId ?? null,
      input.summary,
      input.detail === undefined ? null : JSON.stringify(input.detail),
      input.bindingHash ?? null,
      createdAt,
    )
  return { id, createdAt }
}

export type ComplianceAuditRow = {
  id: string
  iso: string
  flagKey: string
  action: string
  actorUserId: string | null
  peerUserId: string | null
  summary: string
  detailJson: string | null
  bindingHash: string | null
  createdAt: string
}

export function listComplianceAudit(limit = 40): ComplianceAuditRow[] {
  ensureComplianceAuditSchema()
  return (
    getDb()
      .prepare(
        `SELECT * FROM compliance_audit_events ORDER BY created_at DESC LIMIT ?`,
      )
      .all(limit) as Record<string, unknown>[]
  ).map((row) => ({
    id: String(row.id),
    iso: String(row.iso),
    flagKey: String(row.flag_key),
    action: String(row.action),
    actorUserId: row.actor_user_id == null ? null : String(row.actor_user_id),
    peerUserId: row.peer_user_id == null ? null : String(row.peer_user_id),
    summary: String(row.summary),
    detailJson: row.detail_json == null ? null : String(row.detail_json),
    bindingHash: row.binding_hash == null ? null : String(row.binding_hash),
    createdAt: String(row.created_at),
  }))
}

export type ComplianceProposal = {
  id: string
  iso: string
  flagKey: string
  requestedBy: string
  status: string
  bindingHash: string
  createdAt: string
  resolvedAt: string | null
  resolvedBy: string | null
}

function mapProposal(row: Record<string, unknown>): ComplianceProposal {
  return {
    id: String(row.id),
    iso: String(row.iso),
    flagKey: String(row.flag_key),
    requestedBy: String(row.requested_by),
    status: String(row.status),
    bindingHash: String(row.binding_hash),
    createdAt: String(row.created_at),
    resolvedAt: row.resolved_at == null ? null : String(row.resolved_at),
    resolvedBy: row.resolved_by == null ? null : String(row.resolved_by),
  }
}

export function listPendingComplianceProposals(iso?: string): ComplianceProposal[] {
  ensureComplianceAuditSchema()
  if (iso) {
    return (
      getDb()
        .prepare(
          `SELECT * FROM compliance_flag_proposals
           WHERE status = 'pending' AND iso = ? ORDER BY created_at DESC`,
        )
        .all(iso.toUpperCase()) as Record<string, unknown>[]
    ).map(mapProposal)
  }
  return (
    getDb()
      .prepare(
        `SELECT * FROM compliance_flag_proposals
         WHERE status = 'pending' ORDER BY created_at DESC`,
      )
      .all() as Record<string, unknown>[]
  ).map(mapProposal)
}

export function readPayPlaneFlag(id: PayPlaneFlagId): boolean {
  ensureComplianceAuditSchema()
  const raw = getMetaValue(payPlaneMetaKey(id))
  return raw === "1" || raw === "true" || raw === "on"
}

function writePayPlaneFlag(id: PayPlaneFlagId, on: boolean) {
  ensureComplianceAuditSchema()
  setMetaValue(payPlaneMetaKey(id), on ? "1" : "0")
}

export function adminSetLegalFlag(iso: string, key: LegalFeatureFlagKey, on: boolean) {
  ensureLegalFlagOverridesRegistered()
  if (!LEGAL_FEATURE_FLAG_KEYS.includes(key)) {
    return { ok: false as const, error: "Unknown legal flag." }
  }
  return setLegalFlagOverride({ getMetaValue, setMetaValue }, iso, key, on)
}

export function adminClearLegalFlag(iso: string, key: LegalFeatureFlagKey) {
  ensureLegalFlagOverridesRegistered()
  return clearLegalFlagOverride({ getMetaValue, setMetaValue }, iso, key)
}

export function adminListComplianceFlags(isos?: string[]) {
  ensureLegalFlagOverridesRegistered()
  return listComplianceFlagRows(isos)
}

export type ConsoleComplianceRow = {
  iso: string
  key: string
  packDefault: boolean
  effective: boolean
  dataResidencyNotes: string | null
  dataResidencyEnforcedByStorage: false
  label: string
  blurb: string
  money: boolean
  hardLocked: boolean
  payPlane: boolean
  signOffs: NonNullable<ReturnType<typeof catalogEntryFor>>["signOffs"]
  pendingProposal: ComplianceProposal | null
  envMirror: string | null
  host: string | null
  overrideRaw: string | null
}

/** Enriched rows for `/console/compliance` — LEGAL overrides + pay-planes + hard locks. */
export function adminListConsoleCompliance(isos: string[] = ["IN", "CA"]) {
  ensureComplianceAuditSchema()
  const pending = listPendingComplianceProposals()
  const legalRows = adminListComplianceFlags(isos)
  const out: ConsoleComplianceRow[] = []

  for (const iso of isos.map((i) => i.toUpperCase())) {
    const residency = dataResidencyDeclarative(iso)
    for (const entry of COMPLIANCE_CATALOG) {
      if (!entry.countries.includes(iso as "IN" | "CA")) continue

      if (entry.hardLocked) {
        out.push({
          iso,
          key: entry.key,
          packDefault: false,
          effective: false,
          dataResidencyNotes: residency.notes,
          dataResidencyEnforcedByStorage: false,
          label: entry.label,
          blurb: entry.blurb,
          money: entry.money,
          hardLocked: true,
          payPlane: false,
          signOffs: entry.signOffs,
          pendingProposal: null,
          envMirror: null,
          host: null,
          overrideRaw: null,
        })
        continue
      }

      if (entry.payPlane && isPayPlaneFlagId(entry.key)) {
        const on = readPayPlaneFlag(entry.key)
        out.push({
          iso,
          key: entry.key,
          packDefault: false,
          effective: on,
          dataResidencyNotes: residency.notes,
          dataResidencyEnforcedByStorage: false,
          label: entry.label,
          blurb: entry.blurb,
          money: true,
          hardLocked: false,
          payPlane: true,
          signOffs: entry.signOffs,
          pendingProposal: pending.find((p) => p.iso === iso && p.flagKey === entry.key) ?? null,
          envMirror: PAY_PLANE_ENV_KEYS[entry.key],
          host: PAY_PLANE_HOSTS[entry.key],
          overrideRaw: getMetaValue(payPlaneMetaKey(entry.key)),
        })
        continue
      }

      const legalKey = entry.key as LegalFeatureFlagKey
      const base = legalRows.find((r) => r.iso === iso && r.key === legalKey)
      if (!base) continue
      out.push({
        iso: base.iso,
        key: base.key,
        packDefault: base.packDefault,
        effective: base.effective,
        dataResidencyNotes: residency.notes ?? base.dataResidencyNotes,
        dataResidencyEnforcedByStorage: false,
        label: entry.label,
        blurb: entry.blurb,
        money: entry.money,
        hardLocked: false,
        payPlane: false,
        signOffs: entry.signOffs,
        pendingProposal: pending.find((p) => p.iso === iso && p.flagKey === legalKey) ?? null,
        envMirror: null,
        host: null,
        overrideRaw: getMetaValue(legalOverrideMetaKey(iso, legalKey)),
      })
    }
  }

  return out
}

export type ComplianceActionResult =
  | { ok: true; auditId?: string; proposalId?: string }
  | { ok: false; error: string; code?: string; auditId?: string }

/**
 * Request enable. Money LEGAL flags + pay-planes → pending peer approve.
 * Non-money → set override immediately.
 */
export function adminRequestEnableFlag(input: {
  iso: string
  key: string
  actorUserId: string
}): ComplianceActionResult {
  ensureComplianceAuditSchema()
  const entry = catalogEntryFor(input.key)
  if (!entry) return { ok: false, error: "Unknown compliance flag.", code: "unknown" }
  if (entry.hardLocked) {
    return { ok: false, error: "Hard-locked OFF — not toggleable.", code: "hard_locked" }
  }

  const iso = entry.payPlane && isPayPlaneFlagId(entry.key)
    ? PAY_PLANE_COUNTRY[entry.key]
    : input.iso.toUpperCase()

  if (!entry.countries.includes(iso as "IN" | "CA")) {
    return { ok: false, error: `Flag not available for ${iso}.`, code: "wrong_country" }
  }

  const currentlyOn = entry.payPlane && isPayPlaneFlagId(entry.key)
    ? readPayPlaneFlag(entry.key)
    : adminListComplianceFlags([iso]).find((r) => r.key === entry.key)?.effective === true
  if (currentlyOn) return { ok: false, error: "Flag already ON.", code: "already_on" }

  if (entry.money) {
    getDb()
      .prepare(
        `UPDATE compliance_flag_proposals
         SET status = 'cancelled', resolved_at = ?, resolved_by = ?
         WHERE iso = ? AND flag_key = ? AND status = 'pending'`,
      )
      .run(new Date().toISOString(), input.actorUserId, iso, entry.key)

    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const hash = bindingHash({
      iso,
      flagKey: entry.key,
      requestedBy: input.actorUserId,
      createdAt,
    })
    getDb()
      .prepare(
        `INSERT INTO compliance_flag_proposals
          (id, iso, flag_key, requested_by, status, binding_hash, created_at, resolved_at, resolved_by)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, NULL, NULL)`,
      )
      .run(id, iso, entry.key, input.actorUserId, hash, createdAt)
    const audit = writeAudit({
      iso,
      flagKey: entry.key,
      action: "propose_enable",
      actorUserId: input.actorUserId,
      summary: `Proposed enable ${entry.key} for ${iso} (awaits peer)`,
      bindingHash: hash,
      detail: { proposalId: id, signOffs: entry.signOffs },
    })
    return { ok: true, auditId: audit.id, proposalId: id }
  }

  // Non-money LEGAL — set override ON immediately.
  const set = adminSetLegalFlag(iso, entry.key as LegalFeatureFlagKey, true)
  if (!set.ok) return set
  const audit = writeAudit({
    iso,
    flagKey: entry.key,
    action: "enable",
    actorUserId: input.actorUserId,
    summary: `Enabled ${entry.key} for ${iso}`,
    detail: { signOffs: entry.signOffs },
  })
  return { ok: true, auditId: audit.id }
}

export function adminApproveEnableProposal(input: {
  proposalId: string
  actorUserId: string
}): ComplianceActionResult {
  ensureComplianceAuditSchema()
  const row = getDb()
    .prepare("SELECT * FROM compliance_flag_proposals WHERE id = ?")
    .get(input.proposalId) as Record<string, unknown> | undefined
  if (!row) return { ok: false, error: "Proposal not found.", code: "not_found" }
  const proposal = mapProposal(row)
  if (proposal.status !== "pending") {
    return { ok: false, error: "Proposal is not pending.", code: "not_pending" }
  }
  if (proposal.requestedBy === input.actorUserId) {
    const audit = writeAudit({
      iso: proposal.iso,
      flagKey: proposal.flagKey,
      action: "self_approval_blocked",
      actorUserId: input.actorUserId,
      summary: `Self-approval blocked for money flag ${proposal.flagKey}`,
      bindingHash: proposal.bindingHash,
      detail: { proposalId: proposal.id },
    })
    return {
      ok: false,
      error: "Self-approval blocked for money flags. A distinct L0/L1 peer must approve.",
      code: "self_approval",
      auditId: audit.id,
    }
  }

  if (isPayPlaneFlagId(proposal.flagKey)) {
    writePayPlaneFlag(proposal.flagKey, true)
  } else {
    const set = adminSetLegalFlag(proposal.iso, proposal.flagKey as LegalFeatureFlagKey, true)
    if (!set.ok) return set
  }

  const now = new Date().toISOString()
  getDb()
    .prepare(
      `UPDATE compliance_flag_proposals
       SET status = 'approved', resolved_at = ?, resolved_by = ? WHERE id = ?`,
    )
    .run(now, input.actorUserId, proposal.id)
  const audit = writeAudit({
    iso: proposal.iso,
    flagKey: proposal.flagKey,
    action: "approve_enable",
    actorUserId: input.actorUserId,
    peerUserId: proposal.requestedBy,
    summary: `Peer-approved enable ${proposal.flagKey} for ${proposal.iso}`,
    bindingHash: proposal.bindingHash,
    detail: { proposalId: proposal.id },
  })
  return { ok: true, auditId: audit.id, proposalId: proposal.id }
}

export function adminRejectEnableProposal(input: {
  proposalId: string
  actorUserId: string
}): ComplianceActionResult {
  ensureComplianceAuditSchema()
  const row = getDb()
    .prepare("SELECT * FROM compliance_flag_proposals WHERE id = ?")
    .get(input.proposalId) as Record<string, unknown> | undefined
  if (!row) return { ok: false, error: "Proposal not found.", code: "not_found" }
  const proposal = mapProposal(row)
  if (proposal.status !== "pending") {
    return { ok: false, error: "Proposal is not pending.", code: "not_pending" }
  }
  getDb()
    .prepare(
      `UPDATE compliance_flag_proposals
       SET status = 'rejected', resolved_at = ?, resolved_by = ? WHERE id = ?`,
    )
    .run(new Date().toISOString(), input.actorUserId, proposal.id)
  const audit = writeAudit({
    iso: proposal.iso,
    flagKey: proposal.flagKey,
    action: "reject_enable",
    actorUserId: input.actorUserId,
    peerUserId: proposal.requestedBy,
    summary: `Rejected enable ${proposal.flagKey} for ${proposal.iso}`,
    bindingHash: proposal.bindingHash,
  })
  return { ok: true, auditId: audit.id, proposalId: proposal.id }
}

/** Disable immediately (single actor OK — fail-closed). */
export function adminDisableFlag(input: {
  iso: string
  key: string
  actorUserId: string
}): ComplianceActionResult {
  ensureComplianceAuditSchema()
  const entry = catalogEntryFor(input.key)
  if (!entry) return { ok: false, error: "Unknown flag.", code: "unknown" }
  if (entry.hardLocked) {
    return { ok: false, error: "Hard-locked OFF.", code: "hard_locked" }
  }
  const iso = entry.payPlane && isPayPlaneFlagId(entry.key)
    ? PAY_PLANE_COUNTRY[entry.key]
    : input.iso.toUpperCase()

  if (isPayPlaneFlagId(entry.key)) {
    writePayPlaneFlag(entry.key, false)
  } else {
    adminClearLegalFlag(iso, entry.key as LegalFeatureFlagKey)
    // Also force OFF override so pack default ON cannot resurrect (defaults are OFF).
    adminSetLegalFlag(iso, entry.key as LegalFeatureFlagKey, false)
  }

  getDb()
    .prepare(
      `UPDATE compliance_flag_proposals
       SET status = 'cancelled', resolved_at = ?, resolved_by = ?
       WHERE iso = ? AND flag_key = ? AND status = 'pending'`,
    )
    .run(new Date().toISOString(), input.actorUserId, iso, entry.key)

  const audit = writeAudit({
    iso,
    flagKey: entry.key,
    action: "disable",
    actorUserId: input.actorUserId,
    summary: `Disabled ${entry.key} for ${iso}`,
  })
  return { ok: true, auditId: audit.id }
}

export { LEGAL_OVERRIDE_META_PREFIX, PAY_PLANE_FLAG_IDS, PAY_PLANE_ENV_KEYS, PAY_PLANE_HOSTS }

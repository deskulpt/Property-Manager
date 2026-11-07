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
  COMPLIANCE_PROPOSAL_TTL_MS,
  INDIA_COMPLIANCE_PARKED,
  INDIA_MONEY_FLAG_KEYS,
  isIndiaMoneyParked,
  isPayPlaneFlagId,
  PAY_PLANE_COUNTRY,
  PAY_PLANE_ENV_KEYS,
  PAY_PLANE_FLAG_IDS,
  PAY_PLANE_HOSTS,
  payPlaneMetaKey,
  TENANT_CARD_FEE_POLICY_LABEL,
  type PayPlaneFlagId,
} from "@/lib/markets/compliance-catalog"
import { notifyMany } from "@/lib/notifications"
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
  /** When false, skip dual-admin alert (e.g. India park force-off on load). */
  alertAdmins?: boolean
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
  if (input.alertAdmins !== false) {
    alertPlatformAdmins({
      title: `Compliance · ${input.action}`,
      body: input.summary,
      sourceId: `compliance_audit:${id}`,
      actorUserId: input.actorUserId ?? null,
      peerUserId: input.peerUserId ?? null,
    })
  }
  return { id, createdAt }
}

/** L0/L1 platform admins — dual-alert target for money/compliance changes. */
export function listPlatformAdminUserIds(): string[] {
  ensureComplianceAuditSchema()
  try {
    return (
      getDb()
        .prepare(
          `SELECT id FROM users WHERE CAST(role_level AS INTEGER) <= 1 ORDER BY role_level ASC, id ASC`,
        )
        .all() as { id: string }[]
    ).map((r) => String(r.id))
  } catch {
    return []
  }
}

function alertPlatformAdmins(input: {
  title: string
  body: string
  sourceId: string
  actorUserId?: string | null
  peerUserId?: string | null
}) {
  const ids = new Set(listPlatformAdminUserIds())
  if (input.actorUserId) ids.add(input.actorUserId)
  if (input.peerUserId) ids.add(input.peerUserId)
  if (ids.size === 0) return
  notifyMany(
    [...ids].map((userId) => ({
      userId,
      title: input.title,
      body: input.body,
      href: "/console/compliance",
      sourceId: `${input.sourceId}:${userId}`,
    })),
  )
}

function proposalExpired(createdAt: string, now = Date.now()): boolean {
  const created = Date.parse(createdAt)
  if (Number.isNaN(created)) return true
  return now - created > COMPLIANCE_PROPOSAL_TTL_MS
}

/** Expire pending money proposals older than 24h; audit + alert both admins. */
export function expireStaleComplianceProposals(now = new Date()): number {
  ensureComplianceAuditSchema()
  const pending = (
    getDb()
      .prepare(`SELECT * FROM compliance_flag_proposals WHERE status = 'pending'`)
      .all() as Record<string, unknown>[]
  ).map(mapProposal)
  let expired = 0
  const nowIso = now.toISOString()
  for (const proposal of pending) {
    if (!proposalExpired(proposal.createdAt, now.getTime())) continue
    getDb()
      .prepare(
        `UPDATE compliance_flag_proposals
         SET status = 'expired', resolved_at = ?, resolved_by = ?
         WHERE id = ? AND status = 'pending'`,
      )
      .run(nowIso, "system:proposal-ttl", proposal.id)
    writeAudit({
      iso: proposal.iso,
      flagKey: proposal.flagKey,
      action: "proposal_expired",
      actorUserId: proposal.requestedBy,
      summary: `Enable proposal for ${proposal.flagKey} (${proposal.iso}) expired after 24h`,
      bindingHash: proposal.bindingHash,
      detail: { proposalId: proposal.id, ttlMs: COMPLIANCE_PROPOSAL_TTL_MS },
    })
    expired += 1
  }
  return expired
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
  expireStaleComplianceProposals()
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
  /** India money surface parked — Canada focus; enable blocked. */
  indiaParked: boolean
  payPlane: boolean
  signOffs: NonNullable<ReturnType<typeof catalogEntryFor>>["signOffs"]
  pendingProposal: ComplianceProposal | null
  envMirror: string | null
  host: string | null
  overrideRaw: string | null
}

/** Force IN money / in-pay OFF while India is parked (Canada focus). */
export function forceIndiaMoneyOff(actorUserId = "system:india-parked") {
  ensureComplianceAuditSchema()
  if (!INDIA_COMPLIANCE_PARKED) return
  for (const key of INDIA_MONEY_FLAG_KEYS) {
    if (isPayPlaneFlagId(key)) {
      if (readPayPlaneFlag(key)) {
        writePayPlaneFlag(key, false)
        writeAudit({
          iso: "IN",
          flagKey: key,
          action: "force_off_india_parked",
          actorUserId,
          summary: `Forced OFF ${key} — India money parked (Canada focus)`,
          alertAdmins: false,
        })
      }
      continue
    }
    if (legalFlagEffective("IN", key)) {
      adminSetLegalFlag("IN", key as LegalFeatureFlagKey, false)
      writeAudit({
        iso: "IN",
        flagKey: key,
        action: "force_off_india_parked",
        actorUserId,
        summary: `Forced OFF ${key} — India money parked (Canada focus)`,
        alertAdmins: false,
      })
    }
    getDb()
      .prepare(
        `UPDATE compliance_flag_proposals
         SET status = 'cancelled', resolved_at = ?, resolved_by = ?
         WHERE iso = 'IN' AND flag_key = ? AND status = 'pending'`,
      )
      .run(new Date().toISOString(), actorUserId, key)
  }
}

function legalFlagEffective(iso: string, key: string): boolean {
  return (
    adminListComplianceFlags([iso]).find((r) => r.key === key)?.effective === true
  )
}

/** Enriched rows for `/console/compliance` — LEGAL overrides + pay-planes + hard locks. */
export function adminListConsoleCompliance(isos: string[] = ["CA", "IN"]) {
  ensureComplianceAuditSchema()
  forceIndiaMoneyOff()
  const pending = listPendingComplianceProposals()
  const legalRows = adminListComplianceFlags(isos)
  const out: ConsoleComplianceRow[] = []

  // Canada focus — emit CA rows first when both requested.
  const ordered = [...isos.map((i) => i.toUpperCase())].sort((a, b) => {
    if (a === "CA") return -1
    if (b === "CA") return 1
    return a.localeCompare(b)
  })

  for (const iso of ordered) {
    const residency = dataResidencyDeclarative(iso)
    for (const entry of COMPLIANCE_CATALOG) {
      if (!entry.countries.includes(iso as "IN" | "CA")) continue
      const indiaParked = isIndiaMoneyParked(iso, entry.key)

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
          indiaParked: false,
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
        const on = indiaParked ? false : readPayPlaneFlag(entry.key)
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
          indiaParked,
          payPlane: true,
          signOffs: entry.signOffs,
          pendingProposal: indiaParked
            ? null
            : pending.find((p) => p.iso === iso && p.flagKey === entry.key) ?? null,
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
        effective: indiaParked ? false : base.effective,
        dataResidencyNotes: residency.notes ?? base.dataResidencyNotes,
        dataResidencyEnforcedByStorage: false,
        label: entry.label,
        blurb: entry.blurb,
        money: entry.money,
        hardLocked: false,
        indiaParked,
        payPlane: false,
        signOffs: entry.signOffs,
        pendingProposal: indiaParked
          ? null
          : pending.find((p) => p.iso === iso && p.flagKey === legalKey) ?? null,
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
    return {
      ok: false,
      error: `${TENANT_CARD_FEE_POLICY_LABEL}. Changing requires counsel review + code release.`,
      code: "hard_locked",
    }
  }

  const iso = entry.payPlane && isPayPlaneFlagId(entry.key)
    ? PAY_PLANE_COUNTRY[entry.key]
    : input.iso.toUpperCase()

  if (!entry.countries.includes(iso as "IN" | "CA")) {
    return { ok: false, error: `Flag not available for ${iso}.`, code: "wrong_country" }
  }
  if (isIndiaMoneyParked(iso, entry.key)) {
    return {
      ok: false,
      error: "India money toggles are parked (Canada focus). Flag stays OFF.",
      code: "india_parked",
    }
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
  if (proposalExpired(proposal.createdAt)) {
    expireStaleComplianceProposals()
    return {
      ok: false,
      error: "Proposal expired after 24h. Request enable again.",
      code: "proposal_expired",
    }
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
  if (isIndiaMoneyParked(proposal.iso, proposal.flagKey)) {
    return {
      ok: false,
      error: "India money toggles are parked (Canada focus). Cannot approve enable.",
      code: "india_parked",
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

/**
 * Disable immediately (single actor OK — fail-closed).
 * Money / pay-plane flags use kill-switch semantics: any single admin can turn payments OFF instantly.
 */
export function adminDisableFlag(input: {
  iso: string
  key: string
  actorUserId: string
}): ComplianceActionResult {
  ensureComplianceAuditSchema()
  const entry = catalogEntryFor(input.key)
  if (!entry) return { ok: false, error: "Unknown flag.", code: "unknown" }
  if (entry.hardLocked) {
    return {
      ok: false,
      error: `${TENANT_CARD_FEE_POLICY_LABEL}. Counsel review + code release required.`,
      code: "hard_locked",
    }
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

  const action = entry.money ? "kill_switch_off" : "disable"
  const audit = writeAudit({
    iso,
    flagKey: entry.key,
    action,
    actorUserId: input.actorUserId,
    summary: entry.money
      ? `Kill-switch OFF ${entry.key} for ${iso} (single-admin instant)`
      : `Disabled ${entry.key} for ${iso}`,
  })
  return { ok: true, auditId: audit.id }
}

export type ComplianceAuditExportRow = {
  eventId: string
  createdAtUtc: string
  actor: string
  approver: string
  action: string
  accountLandlord: string
  stripeRazorpayRef: string
  amount: string
  currency: string
  tax: string
  status: string
}

export type ComplianceAuditExport = {
  rows: ComplianceAuditExportRow[]
  rowCount: number
  exportHash: string
  csv: string
  fromUtc: string | null
  toUtc: string | null
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function detailField(detail: Record<string, unknown> | null, ...keys: string[]): string {
  if (!detail) return ""
  for (const key of keys) {
    const v = detail[key]
    if (v == null || v === "") continue
    return String(v)
  }
  return ""
}

/** Plain decimal string for export — never cents/minor units. */
function plainDecimalAmount(raw: unknown): string {
  if (raw == null || raw === "") return ""
  if (typeof raw === "number" && Number.isFinite(raw)) return raw.toFixed(2)
  const s = String(raw).trim()
  if (!s) return ""
  const n = Number(s)
  if (Number.isFinite(n)) return n.toFixed(2)
  return s
}

/**
 * Append-only audit export (UTF-8 CSV). UTC timestamps; amount + currency + tax columns.
 * Footer carries row_count + sha256 export hash.
 */
export function exportComplianceAuditCsv(input?: {
  fromUtc?: string | null
  toUtc?: string | null
}): ComplianceAuditExport {
  ensureComplianceAuditSchema()
  expireStaleComplianceProposals()
  const fromUtc = input?.fromUtc?.trim() || null
  const toUtc = input?.toUtc?.trim() || null
  const clauses: string[] = []
  const params: string[] = []
  if (fromUtc) {
    clauses.push("created_at >= ?")
    params.push(fromUtc)
  }
  if (toUtc) {
    clauses.push("created_at <= ?")
    params.push(toUtc)
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""
  const dbRows = getDb()
    .prepare(
      `SELECT * FROM compliance_audit_events ${where} ORDER BY created_at ASC, id ASC`,
    )
    .all(...params) as Record<string, unknown>[]

  const rows: ComplianceAuditExportRow[] = dbRows.map((row) => {
    let detail: Record<string, unknown> | null = null
    if (row.detail_json != null && String(row.detail_json)) {
      try {
        detail = JSON.parse(String(row.detail_json)) as Record<string, unknown>
      } catch {
        detail = null
      }
    }
    const action = String(row.action)
    const status =
      detailField(detail, "status") ||
      (action === "approve_enable"
        ? "approved"
        : action === "reject_enable"
          ? "rejected"
          : action === "propose_enable"
            ? "pending"
            : action === "proposal_expired"
              ? "expired"
              : action === "kill_switch_off" || action === "disable"
                ? "off"
                : action === "self_approval_blocked"
                  ? "blocked"
                  : "recorded")
    return {
      eventId: String(row.id),
      createdAtUtc: String(row.created_at),
      actor: row.actor_user_id == null ? "" : String(row.actor_user_id),
      approver: row.peer_user_id == null ? "" : String(row.peer_user_id),
      action,
      accountLandlord: detailField(detail, "accountLandlord", "account", "landlord", "tenantId"),
      stripeRazorpayRef: detailField(
        detail,
        "stripeRazorpayRef",
        "stripeRef",
        "razorpayRef",
        "paymentRef",
      ),
      amount: plainDecimalAmount(detail?.amount),
      currency: detailField(detail, "currency"),
      tax: plainDecimalAmount(detail?.tax),
      status,
    }
  })

  const header = [
    "event_id",
    "created_at_utc",
    "actor",
    "approver",
    "action",
    "account_landlord",
    "stripe_razorpay_ref",
    "amount",
    "currency",
    "tax",
    "status",
  ]
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.eventId,
        r.createdAtUtc,
        r.actor,
        r.approver,
        r.action,
        r.accountLandlord,
        r.stripeRazorpayRef,
        r.amount,
        r.currency,
        r.tax,
        r.status,
      ]
        .map((c) => csvEscape(c))
        .join(","),
    ),
  ]
  const body = lines.join("\n")
  const exportHash = `sha256:${createHash("sha256").update(body, "utf8").digest("hex")}`
  const csv = `${body}\n# row_count=${rows.length}\n# export_hash=${exportHash}\n`
  return {
    rows,
    rowCount: rows.length,
    exportHash,
    csv,
    fromUtc,
    toUtc,
  }
}

export { LEGAL_OVERRIDE_META_PREFIX, PAY_PLANE_FLAG_IDS, PAY_PLANE_ENV_KEYS, PAY_PLANE_HOSTS }

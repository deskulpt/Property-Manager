import "server-only"
import { getDb } from "@/lib/db"
import { writeAuditEvent } from "@/lib/agentic/audit"
import type {
  AgentProposal,
  AgentToolName,
  ListingDraft,
  ProposalStatus,
  ToolPayload,
} from "@/lib/agentic/types"

function asRow(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined
  return { ...(value as object) }
}

function mapProposal(row: Record<string, unknown>): AgentProposal {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    toolName: String(row.tool_name) as AgentToolName,
    payload: JSON.parse(String(row.payload_json)) as ToolPayload,
    status: String(row.status) as ProposalStatus,
    promptSummary: String(row.prompt_summary),
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    decidedBy: row.decided_by == null ? null : String(row.decided_by),
    decidedAt: row.decided_at == null ? null : String(row.decided_at),
    outcomeJson: row.outcome_json == null ? null : String(row.outcome_json),
    error: row.error == null ? null : String(row.error),
  }
}

function mapDraft(row: Record<string, unknown>): ListingDraft {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    propertyId: String(row.property_id),
    unitId: row.unit_id == null ? null : String(row.unit_id),
    code: String(row.code),
    title: String(row.title),
    description: String(row.description),
    ratePsf: Number(row.rate_psf),
    sqft: Number(row.sqft),
    clearHeight: String(row.clear_height),
    docks: Number(row.docks),
    driveIns: Number(row.drive_ins),
    power: String(row.power),
    published: Number(row.published) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    sourceProposalId: row.source_proposal_id == null ? null : String(row.source_proposal_id),
  }
}

export function createProposal(input: {
  tenantId: string
  toolName: AgentToolName
  payload: ToolPayload
  promptSummary: string
  createdBy: string
  /** When true, status starts as pending (mutating tools). Soft draft tools may skip. */
  requiresApproval: boolean
}): AgentProposal {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const status: ProposalStatus = input.requiresApproval ? "pending" : "executed"
  getDb()
    .prepare(
      `INSERT INTO agent_proposals
        (id, tenant_id, tool_name, payload_json, status, prompt_summary, created_by, created_at,
         decided_by, decided_at, outcome_json, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)`,
    )
    .run(
      id,
      input.tenantId,
      input.toolName,
      JSON.stringify(input.payload),
      status,
      input.promptSummary,
      input.createdBy,
      createdAt,
    )
  writeAuditEvent({
    tenantId: input.tenantId,
    kind: "propose",
    proposalId: id,
    summary: `Proposed ${input.toolName}`,
    detail: { toolName: input.toolName, requiresApproval: input.requiresApproval },
    actorUserId: input.createdBy,
  })
  return {
    id,
    tenantId: input.tenantId,
    toolName: input.toolName,
    payload: input.payload,
    status,
    promptSummary: input.promptSummary,
    createdBy: input.createdBy,
    createdAt,
    decidedBy: null,
    decidedAt: null,
    outcomeJson: null,
    error: null,
  }
}

export function getProposal(tenantId: string, proposalId: string): AgentProposal | null {
  const row = asRow(
    getDb()
      .prepare("SELECT * FROM agent_proposals WHERE id = ? AND tenant_id = ?")
      .get(proposalId, tenantId),
  )
  return row ? mapProposal(row) : null
}

export function proposalsForTenant(
  tenantId: string,
  opts?: { status?: ProposalStatus | ProposalStatus[] },
): AgentProposal[] {
  const statuses = opts?.status
    ? Array.isArray(opts.status)
      ? opts.status
      : [opts.status]
    : null
  let sql = "SELECT * FROM agent_proposals WHERE tenant_id = ?"
  const args: unknown[] = [tenantId]
  if (statuses && statuses.length > 0) {
    sql += ` AND status IN (${statuses.map(() => "?").join(",")})`
    args.push(...statuses)
  }
  sql += " ORDER BY created_at DESC"
  const rows = getDb().prepare(sql).all(...(args as string[])) as Record<string, unknown>[]
  return rows.map((row) => mapProposal(asRow(row) ?? row))
}

export function pendingProposals(tenantId: string): AgentProposal[] {
  return proposalsForTenant(tenantId, { status: "pending" })
}

export function markProposal(
  tenantId: string,
  proposalId: string,
  patch: {
    status: ProposalStatus
    decidedBy?: string | null
    outcome?: unknown
    error?: string | null
  },
): AgentProposal | null {
  const existing = getProposal(tenantId, proposalId)
  if (!existing) return null
  const decidedAt = new Date().toISOString()
  getDb()
    .prepare(
      `UPDATE agent_proposals
       SET status = ?, decided_by = ?, decided_at = ?, outcome_json = ?, error = ?
       WHERE id = ? AND tenant_id = ?`,
    )
    .run(
      patch.status,
      patch.decidedBy ?? null,
      decidedAt,
      patch.outcome === undefined ? null : JSON.stringify(patch.outcome),
      patch.error ?? null,
      proposalId,
      tenantId,
    )
  return getProposal(tenantId, proposalId)
}

/**
 * Edit a pending proposal payload in place (MCP `approvals.resolve` decision=edit).
 * Does not execute — proposal stays pending until Approve.
 */
export function updateProposalPayload(input: {
  tenantId: string
  proposalId: string
  actorUserId: string
  payload: ToolPayload
  promptSummary?: string
}): { ok: true; proposal: AgentProposal } | { ok: false; error: string } {
  const existing = getProposal(input.tenantId, input.proposalId)
  if (!existing) return { ok: false, error: "not_found" }
  if (existing.status !== "pending") {
    return { ok: false, error: `Cannot edit a ${existing.status} proposal.` }
  }
  const summary = input.promptSummary?.trim() || existing.promptSummary
  getDb()
    .prepare(
      `UPDATE agent_proposals
       SET payload_json = ?, prompt_summary = ?
       WHERE id = ? AND tenant_id = ? AND status = 'pending'`,
    )
    .run(JSON.stringify(input.payload), summary, input.proposalId, input.tenantId)
  writeAuditEvent({
    tenantId: input.tenantId,
    kind: "propose",
    proposalId: input.proposalId,
    summary: `Edited pending ${existing.toolName}`,
    detail: { toolName: existing.toolName, edit: true },
    actorUserId: input.actorUserId,
  })
  const proposal = getProposal(input.tenantId, input.proposalId)
  if (!proposal) return { ok: false, error: "Edit write failed." }
  return { ok: true, proposal }
}

/** Soft-apply draft listing fields. Never sets published=1. */
export function applyListingDraft(input: {
  tenantId: string
  propertyId: string
  unitId?: string | null
  code: string
  title: string
  description: string
  ratePsf: number
  sqft: number
  clearHeight: string
  docks: number
  driveIns: number
  power: string
  sourceProposalId?: string | null
  actorUserId: string
}): { ok: true; draft: ListingDraft } | { ok: false; error: string } {
  const db = getDb()
  const property = asRow(
    db
      .prepare("SELECT id FROM properties WHERE id = ? AND tenant_id = ?")
      .get(input.propertyId, input.tenantId),
  )
  if (!property) return { ok: false, error: "That building is not in this organisation." }
  if (input.unitId) {
    const unit = asRow(
      db
        .prepare("SELECT id FROM units WHERE id = ? AND property_id = ? AND tenant_id = ?")
        .get(input.unitId, input.propertyId, input.tenantId),
    )
    if (!unit) return { ok: false, error: "That bay is not in the selected building." }
  }
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO listing_drafts
      (id, tenant_id, property_id, unit_id, code, title, description, rate_psf, sqft,
       clear_height, docks, drive_ins, power, published, created_at, updated_at, source_proposal_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
  ).run(
    id,
    input.tenantId,
    input.propertyId,
    input.unitId ?? null,
    input.code,
    input.title,
    input.description,
    input.ratePsf,
    input.sqft,
    input.clearHeight,
    input.docks,
    input.driveIns,
    input.power,
    now,
    now,
    input.sourceProposalId ?? null,
  )
  // Soft-apply description onto an existing unit when linked — status stays as-is (not a publish).
  if (input.unitId) {
    db.prepare(
      `UPDATE units SET description = ?, rate_psf = ?, sqft = ?, clear_height = ?,
        docks = ?, drive_ins = ?, power = ?
       WHERE id = ? AND tenant_id = ?`,
    ).run(
      input.description,
      input.ratePsf,
      input.sqft,
      input.clearHeight,
      input.docks,
      input.driveIns,
      input.power,
      input.unitId,
      input.tenantId,
    )
  }
  writeAuditEvent({
    tenantId: input.tenantId,
    kind: "draft_apply",
    proposalId: input.sourceProposalId ?? null,
    summary: `Draft listing saved for bay ${input.code} (unpublished)`,
    detail: { draftId: id, published: false },
    actorUserId: input.actorUserId,
  })
  const draft = listingDraftById(input.tenantId, id)
  if (!draft) return { ok: false, error: "Draft write failed." }
  return { ok: true, draft }
}

export function listingDraftById(tenantId: string, id: string): ListingDraft | null {
  const row = asRow(
    getDb()
      .prepare("SELECT * FROM listing_drafts WHERE id = ? AND tenant_id = ?")
      .get(id, tenantId),
  )
  return row ? mapDraft(row) : null
}

export function listingDraftsForTenant(tenantId: string): ListingDraft[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM listing_drafts WHERE tenant_id = ? ORDER BY updated_at DESC`,
    )
    .all(tenantId) as Record<string, unknown>[]
  return rows.map((row) => mapDraft(asRow(row) ?? row))
}

/** Hard rule helper: publish must never happen from stub autofill. */
export function publishListingDraft(
  _tenantId: string,
  _draftId: string,
): { ok: false; error: string } {
  return {
    ok: false,
    error: "Publishing a listing draft requires an explicit approve step (not in L.0 stub autofill).",
  }
}

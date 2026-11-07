import "server-only"
import { getDb } from "@/lib/db"
import type { AgentAuditEvent, AuditKind } from "@/lib/agentic/types"
import {
  dualControlAuditCsvHeader,
  dualControlAuditCsvRow,
} from "@/lib/mcp/dual-control"

function asRow(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined
  return { ...(value as object) }
}

function mapAudit(row: Record<string, unknown>): AgentAuditEvent {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    kind: String(row.kind) as AuditKind,
    proposalId: row.proposal_id == null ? null : String(row.proposal_id),
    summary: String(row.summary),
    detailJson: row.detail_json == null ? null : String(row.detail_json),
    actorUserId: row.actor_user_id == null ? null : String(row.actor_user_id),
    createdAt: String(row.created_at),
  }
}

function parseDetail(detailJson: string | null): Record<string, unknown> {
  if (!detailJson) return {}
  try {
    const parsed = JSON.parse(detailJson) as unknown
    if (!parsed || typeof parsed !== "object") return {}
    return parsed as Record<string, unknown>
  } catch {
    return {}
  }
}

export function writeAuditEvent(input: {
  tenantId: string
  kind: AuditKind
  summary: string
  proposalId?: string | null
  detail?: unknown
  actorUserId?: string | null
}): AgentAuditEvent {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const detailJson = input.detail === undefined ? null : JSON.stringify(input.detail)
  getDb()
    .prepare(
      `INSERT INTO agent_audit_events
        (id, tenant_id, kind, proposal_id, summary, detail_json, actor_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.tenantId,
      input.kind,
      input.proposalId ?? null,
      input.summary,
      detailJson,
      input.actorUserId ?? null,
      createdAt,
    )
  return {
    id,
    tenantId: input.tenantId,
    kind: input.kind,
    proposalId: input.proposalId ?? null,
    summary: input.summary,
    detailJson,
    actorUserId: input.actorUserId ?? null,
    createdAt,
  }
}

export function auditEventsForTenant(tenantId: string, limit = 50): AgentAuditEvent[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM agent_audit_events
       WHERE tenant_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(tenantId, limit) as Record<string, unknown>[]
  return rows.map((row) => mapAudit(asRow(row) ?? row))
}

/** Sum of amountCadCents on approve events for an approver since UTC midnight (Finance daily cap). */
export function approverApprovedCadCentsToday(
  tenantId: string,
  approverUserId: string,
  now = new Date(),
): number {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString()
  const rows = getDb()
    .prepare(
      `SELECT detail_json FROM agent_audit_events
       WHERE tenant_id = ?
         AND actor_user_id = ?
         AND kind = 'approve'
         AND created_at >= ?`,
    )
    .all(tenantId, approverUserId, start) as Array<{ detail_json: string | null }>

  let sum = 0
  for (const row of rows) {
    const detail = parseDetail(row.detail_json)
    const amount = detail.amountCadCents
    if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
      sum += Math.floor(amount)
    }
  }
  return sum
}

/**
 * Books-exportable CSV of dual-control approve/reject/fail events.
 * Columns match Finance D09 audit expectation (binding hash + actors + timestamps).
 */
export function exportDualControlAuditCsv(tenantId: string, limit = 500): string {
  const rows = getDb()
    .prepare(
      `SELECT * FROM agent_audit_events
       WHERE tenant_id = ?
         AND kind IN ('approve', 'reject', 'fail')
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .all(tenantId, limit) as Record<string, unknown>[]

  const lines = [dualControlAuditCsvHeader()]
  for (const raw of rows) {
    const evt = mapAudit(asRow(raw) ?? raw)
    const detail = parseDetail(evt.detailJson)
    if (detail.booksExportable !== true && evt.kind === "fail" && detail.code == null) {
      continue
    }
    const decision =
      evt.kind === "approve" ? "approved" : evt.kind === "reject" ? "rejected" : "failed"
    lines.push(
      dualControlAuditCsvRow({
        auditId: evt.id,
        tenantId: evt.tenantId,
        proposalId: evt.proposalId ?? "",
        toolName: typeof detail.toolName === "string" ? detail.toolName : "",
        createdBy: typeof detail.createdBy === "string" ? detail.createdBy : "",
        decidedBy: evt.actorUserId ?? "",
        decidedAt: evt.createdAt,
        bindingHash: typeof detail.bindingHash === "string" ? detail.bindingHash : "",
        amountCadCents:
          typeof detail.amountCadCents === "number" ? detail.amountCadCents : null,
        decision,
      }),
    )
  }
  return `${lines.join("\n")}\n`
}

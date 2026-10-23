import "server-only"
import { getDb } from "@/lib/db"
import type { AgentAuditEvent, AuditKind } from "@/lib/agentic/types"

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

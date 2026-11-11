/**
 * Append-only, tamper-resistant audit ledger (D09).
 *
 * Plain SQLite rows are not enough for live money. This module:
 * - hash-chains each entry (prev_hash → entry_hash)
 * - installs SQLite triggers that reject UPDATE/DELETE on the ledger table
 * - verifies the chain for export / go-live checks
 *
 * Not WORM object-lock / KMS — that remains an Aloke hosting decision.
 * This is the Eng minimum before live money certification.
 */

import { createHash, createHmac } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"

export const APPEND_ONLY_LEDGER_TABLE = "append_only_audit_ledger"

export type LedgerDomain =
  | "compliance"
  | "dual_control"
  | "billing"
  | "affiliate"
  | "other"

export type LedgerAppendInput = {
  domain: LedgerDomain
  action: string
  summary: string
  actorUserId?: string | null
  peerUserId?: string | null
  entityType?: string | null
  entityId?: string | null
  detail?: unknown
  bindingHash?: string | null
  /** Optional correlation id from an outer system (compliance event id, etc.) */
  correlationId?: string | null
}

export type LedgerEntry = {
  seq: number
  id: string
  domain: LedgerDomain
  action: string
  summary: string
  actorUserId: string | null
  peerUserId: string | null
  entityType: string | null
  entityId: string | null
  detailJson: string | null
  bindingHash: string | null
  correlationId: string | null
  prevHash: string
  entryHash: string
  createdAt: string
}

type Sql = DatabaseSync

const GENESIS_PREV = "genesis"

function signingKey(): string | null {
  const key = process.env.DESKULPT_SECRET_KEY?.trim()
  return key && key.length >= 16 ? key : null
}

function hashPayload(canonical: string): string {
  const digest = createHash("sha256").update(canonical).digest("hex")
  const key = signingKey()
  if (key) {
    return `hmac-sha256:${createHmac("sha256", key).update(`v1:ledger:${digest}`).digest("hex")}`
  }
  return `sha256:${digest}`
}

function canonicalForHash(input: {
  seq: number
  id: string
  domain: string
  action: string
  summary: string
  actorUserId: string | null
  peerUserId: string | null
  entityType: string | null
  entityId: string | null
  detailJson: string | null
  bindingHash: string | null
  correlationId: string | null
  prevHash: string
  createdAt: string
}): string {
  return JSON.stringify({
    seq: input.seq,
    id: input.id,
    domain: input.domain,
    action: input.action,
    summary: input.summary,
    actorUserId: input.actorUserId,
    peerUserId: input.peerUserId,
    entityType: input.entityType,
    entityId: input.entityId,
    detailJson: input.detailJson,
    bindingHash: input.bindingHash,
    correlationId: input.correlationId,
    prevHash: input.prevHash,
    createdAt: input.createdAt,
  })
}

export function ensureAppendOnlyLedgerSchema(db: Sql): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${APPEND_ONLY_LEDGER_TABLE} (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL,
      action TEXT NOT NULL,
      summary TEXT NOT NULL,
      actor_user_id TEXT,
      peer_user_id TEXT,
      entity_type TEXT,
      entity_id TEXT,
      detail_json TEXT,
      binding_hash TEXT,
      correlation_id TEXT,
      prev_hash TEXT NOT NULL,
      entry_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_append_only_ledger_domain
      ON ${APPEND_ONLY_LEDGER_TABLE}(domain, created_at);
  `)

  // Fail closed on mutation — append-only.
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_append_only_ledger_no_update
    BEFORE UPDATE ON ${APPEND_ONLY_LEDGER_TABLE}
    BEGIN
      SELECT RAISE(ABORT, 'append_only_audit_ledger is append-only (UPDATE forbidden)');
    END;
    CREATE TRIGGER IF NOT EXISTS trg_append_only_ledger_no_delete
    BEFORE DELETE ON ${APPEND_ONLY_LEDGER_TABLE}
    BEGIN
      SELECT RAISE(ABORT, 'append_only_audit_ledger is append-only (DELETE forbidden)');
    END;
  `)
}

function mapRow(row: Record<string, unknown>): LedgerEntry {
  return {
    seq: Number(row.seq),
    id: String(row.id),
    domain: String(row.domain) as LedgerDomain,
    action: String(row.action),
    summary: String(row.summary),
    actorUserId: row.actor_user_id == null ? null : String(row.actor_user_id),
    peerUserId: row.peer_user_id == null ? null : String(row.peer_user_id),
    entityType: row.entity_type == null ? null : String(row.entity_type),
    entityId: row.entity_id == null ? null : String(row.entity_id),
    detailJson: row.detail_json == null ? null : String(row.detail_json),
    bindingHash: row.binding_hash == null ? null : String(row.binding_hash),
    correlationId: row.correlation_id == null ? null : String(row.correlation_id),
    prevHash: String(row.prev_hash),
    entryHash: String(row.entry_hash),
    createdAt: String(row.created_at),
  }
}

export function appendLedgerEntry(db: Sql, input: LedgerAppendInput): LedgerEntry {
  ensureAppendOnlyLedgerSchema(db)
  const last = db
    .prepare(
      `SELECT seq, entry_hash FROM ${APPEND_ONLY_LEDGER_TABLE} ORDER BY seq DESC LIMIT 1`,
    )
    .get() as { seq: number; entry_hash: string } | undefined
  const prevHash = last?.entry_hash ?? GENESIS_PREV
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const detailJson =
    input.detail === undefined ? null : JSON.stringify(input.detail)
  const nextSeq = (last?.seq ?? 0) + 1
  const entryHash = hashPayload(
    canonicalForHash({
      seq: nextSeq,
      id,
      domain: input.domain,
      action: input.action,
      summary: input.summary,
      actorUserId: input.actorUserId ?? null,
      peerUserId: input.peerUserId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      detailJson,
      bindingHash: input.bindingHash ?? null,
      correlationId: input.correlationId ?? null,
      prevHash,
      createdAt,
    }),
  )

  db.prepare(
    `INSERT INTO ${APPEND_ONLY_LEDGER_TABLE} (
      id, domain, action, summary, actor_user_id, peer_user_id,
      entity_type, entity_id, detail_json, binding_hash, correlation_id,
      prev_hash, entry_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.domain,
    input.action,
    input.summary,
    input.actorUserId ?? null,
    input.peerUserId ?? null,
    input.entityType ?? null,
    input.entityId ?? null,
    detailJson,
    input.bindingHash ?? null,
    input.correlationId ?? null,
    prevHash,
    entryHash,
    createdAt,
  )

  const row = db
    .prepare(`SELECT * FROM ${APPEND_ONLY_LEDGER_TABLE} WHERE id = ?`)
    .get(id) as Record<string, unknown>
  return mapRow(row)
}

export type LedgerVerifyResult =
  | { ok: true; entries: number; tipHash: string | null }
  | { ok: false; error: string; atSeq?: number }

export function verifyAppendOnlyLedger(db: Sql): LedgerVerifyResult {
  ensureAppendOnlyLedgerSchema(db)
  const rows = db
    .prepare(`SELECT * FROM ${APPEND_ONLY_LEDGER_TABLE} ORDER BY seq ASC`)
    .all() as Record<string, unknown>[]
  let prevHash = GENESIS_PREV
  let tipHash: string | null = null
  for (const raw of rows) {
    const entry = mapRow(raw)
    if (entry.prevHash !== prevHash) {
      return {
        ok: false,
        error: `prev_hash mismatch at seq ${entry.seq}`,
        atSeq: entry.seq,
      }
    }
    const expected = hashPayload(
      canonicalForHash({
        seq: entry.seq,
        id: entry.id,
        domain: entry.domain,
        action: entry.action,
        summary: entry.summary,
        actorUserId: entry.actorUserId,
        peerUserId: entry.peerUserId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        detailJson: entry.detailJson,
        bindingHash: entry.bindingHash,
        correlationId: entry.correlationId,
        prevHash: entry.prevHash,
        createdAt: entry.createdAt,
      }),
    )
    if (expected !== entry.entryHash) {
      return {
        ok: false,
        error: `entry_hash mismatch at seq ${entry.seq}`,
        atSeq: entry.seq,
      }
    }
    prevHash = entry.entryHash
    tipHash = entry.entryHash
  }
  return { ok: true, entries: rows.length, tipHash }
}

export function listLedgerEntries(
  db: Sql,
  opts?: { domain?: LedgerDomain; limit?: number },
): LedgerEntry[] {
  ensureAppendOnlyLedgerSchema(db)
  const limit = Math.max(1, Math.min(500, opts?.limit ?? 100))
  if (opts?.domain) {
    return (
      db
        .prepare(
          `SELECT * FROM ${APPEND_ONLY_LEDGER_TABLE}
           WHERE domain = ? ORDER BY seq DESC LIMIT ?`,
        )
        .all(opts.domain, limit) as Record<string, unknown>[]
    ).map(mapRow)
  }
  return (
    db
      .prepare(
        `SELECT * FROM ${APPEND_ONLY_LEDGER_TABLE} ORDER BY seq DESC LIMIT ?`,
      )
      .all(limit) as Record<string, unknown>[]
  ).map(mapRow)
}

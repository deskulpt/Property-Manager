/**
 * Canada Connect E2E persistence (DEMO / design-test).
 * CREATE TABLE IF NOT EXISTS — same pattern as CountryPack store.
 * Never records a live Stripe charge.
 */

import "server-only"
import { getDb } from "@/lib/db"

function asRow(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null
  return value as Record<string, unknown>
}

let ensured = false

export function resetCanadaConnectStoreCache() {
  ensured = false
}

export function ensureCanadaConnectSchema() {
  if (ensured) return
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS ca_connect_accounts (
      tenant_id TEXT PRIMARY KEY,
      connected_account_id TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL,
      charges_enabled INTEGER NOT NULL DEFAULT 0,
      payouts_enabled INTEGER NOT NULL DEFAULT 0,
      onboarded_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ca_pad_mandates (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      connected_account_id TEXT NOT NULL,
      status TEXT NOT NULL,
      bank_last4 TEXT NOT NULL,
      payment_schedule TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ca_connect_checkouts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      connected_account_id TEXT NOT NULL,
      client_reference_id TEXT NOT NULL,
      rent_cad_cents INTEGER NOT NULL,
      application_fee_inclusive_cad_cents INTEGER NOT NULL,
      status TEXT NOT NULL,
      pad_mandate_id TEXT,
      demo_only INTEGER NOT NULL DEFAULT 1,
      live_charge INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      settled_at TEXT
    );
    CREATE TABLE IF NOT EXISTS ca_landlord_statements (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      period_yyyy_mm TEXT NOT NULL,
      statement_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(tenant_id, period_yyyy_mm)
    );
  `)
  ensured = true
}

export type CaConnectAccountRow = {
  tenantId: string
  connectedAccountId: string
  email: string
  status: "pending" | "onboarded"
  chargesEnabled: boolean
  payoutsEnabled: boolean
  onboardedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CaPadMandateRow = {
  id: string
  tenantId: string
  connectedAccountId: string
  status: "pending" | "active" | "revoked"
  bankLast4: string
  paymentSchedule: "sporadic"
  createdAt: string
  updatedAt: string
}

export type CaConnectCheckoutRow = {
  id: string
  tenantId: string
  connectedAccountId: string
  clientReferenceId: string
  rentCadCents: number
  applicationFeeInclusiveCadCents: number
  status: "open" | "demo_settled" | "canceled"
  padMandateId: string | null
  demoOnly: true
  liveCharge: false
  createdAt: string
  settledAt: string | null
}

export type CaLandlordStatementRow = {
  id: string
  tenantId: string
  periodYyyyMm: string
  statementJson: string
  createdAt: string
}

function mapAccount(row: Record<string, unknown>): CaConnectAccountRow {
  return {
    tenantId: String(row.tenant_id),
    connectedAccountId: String(row.connected_account_id),
    email: String(row.email),
    status: String(row.status) === "onboarded" ? "onboarded" : "pending",
    chargesEnabled: Number(row.charges_enabled) === 1,
    payoutsEnabled: Number(row.payouts_enabled) === 1,
    onboardedAt: row.onboarded_at ? String(row.onboarded_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapMandate(row: Record<string, unknown>): CaPadMandateRow {
  const statusRaw = String(row.status)
  const status: CaPadMandateRow["status"] =
    statusRaw === "active" ? "active" : statusRaw === "revoked" ? "revoked" : "pending"
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    connectedAccountId: String(row.connected_account_id),
    status,
    bankLast4: String(row.bank_last4),
    paymentSchedule: "sporadic",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapCheckout(row: Record<string, unknown>): CaConnectCheckoutRow {
  const statusRaw = String(row.status)
  const status: CaConnectCheckoutRow["status"] =
    statusRaw === "demo_settled"
      ? "demo_settled"
      : statusRaw === "canceled"
        ? "canceled"
        : "open"
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    connectedAccountId: String(row.connected_account_id),
    clientReferenceId: String(row.client_reference_id),
    rentCadCents: Number(row.rent_cad_cents),
    applicationFeeInclusiveCadCents: Number(row.application_fee_inclusive_cad_cents),
    status,
    padMandateId: row.pad_mandate_id ? String(row.pad_mandate_id) : null,
    demoOnly: true,
    liveCharge: false,
    createdAt: String(row.created_at),
    settledAt: row.settled_at ? String(row.settled_at) : null,
  }
}

export function getCaConnectAccount(tenantId: string): CaConnectAccountRow | null {
  ensureCanadaConnectSchema()
  const row = asRow(
    getDb().prepare("SELECT * FROM ca_connect_accounts WHERE tenant_id = ?").get(tenantId),
  )
  return row ? mapAccount(row) : null
}

export function upsertCaConnectAccount(input: {
  tenantId: string
  connectedAccountId: string
  email: string
  status: "pending" | "onboarded"
  chargesEnabled: boolean
  payoutsEnabled: boolean
  onboardedAt: string | null
}): CaConnectAccountRow {
  ensureCanadaConnectSchema()
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO ca_connect_accounts (
         tenant_id, connected_account_id, email, status, charges_enabled, payouts_enabled,
         onboarded_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id) DO UPDATE SET
         connected_account_id = excluded.connected_account_id,
         email = excluded.email,
         status = excluded.status,
         charges_enabled = excluded.charges_enabled,
         payouts_enabled = excluded.payouts_enabled,
         onboarded_at = excluded.onboarded_at,
         updated_at = excluded.updated_at`,
    )
    .run(
      input.tenantId,
      input.connectedAccountId,
      input.email,
      input.status,
      input.chargesEnabled ? 1 : 0,
      input.payoutsEnabled ? 1 : 0,
      input.onboardedAt,
      now,
      now,
    )
  const row = getCaConnectAccount(input.tenantId)
  if (!row) throw new Error("ca_connect_accounts upsert failed")
  return row
}

export function listCaPadMandates(tenantId: string): CaPadMandateRow[] {
  ensureCanadaConnectSchema()
  return (
    getDb()
      .prepare(
        `SELECT * FROM ca_pad_mandates WHERE tenant_id = ? ORDER BY created_at DESC`,
      )
      .all(tenantId) as Record<string, unknown>[]
  ).map(mapMandate)
}

export function insertCaPadMandate(input: {
  id: string
  tenantId: string
  connectedAccountId: string
  status: "pending" | "active"
  bankLast4: string
}): CaPadMandateRow {
  ensureCanadaConnectSchema()
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO ca_pad_mandates (
         id, tenant_id, connected_account_id, status, bank_last4, payment_schedule, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, 'sporadic', ?, ?)`,
    )
    .run(
      input.id,
      input.tenantId,
      input.connectedAccountId,
      input.status,
      input.bankLast4,
      now,
      now,
    )
  const row = asRow(getDb().prepare("SELECT * FROM ca_pad_mandates WHERE id = ?").get(input.id))
  if (!row) throw new Error("ca_pad_mandates insert failed")
  return mapMandate(row)
}

export function activateCaPadMandate(id: string): CaPadMandateRow | null {
  ensureCanadaConnectSchema()
  const now = new Date().toISOString()
  getDb()
    .prepare(`UPDATE ca_pad_mandates SET status = 'active', updated_at = ? WHERE id = ?`)
    .run(now, id)
  const row = asRow(getDb().prepare("SELECT * FROM ca_pad_mandates WHERE id = ?").get(id))
  return row ? mapMandate(row) : null
}

export function insertCaConnectCheckout(input: {
  id: string
  tenantId: string
  connectedAccountId: string
  clientReferenceId: string
  rentCadCents: number
  applicationFeeInclusiveCadCents: number
  padMandateId: string | null
}): CaConnectCheckoutRow {
  ensureCanadaConnectSchema()
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO ca_connect_checkouts (
         id, tenant_id, connected_account_id, client_reference_id, rent_cad_cents,
         application_fee_inclusive_cad_cents, status, pad_mandate_id, demo_only, live_charge,
         created_at, settled_at
       ) VALUES (?, ?, ?, ?, ?, ?, 'open', ?, 1, 0, ?, NULL)`,
    )
    .run(
      input.id,
      input.tenantId,
      input.connectedAccountId,
      input.clientReferenceId,
      input.rentCadCents,
      input.applicationFeeInclusiveCadCents,
      input.padMandateId,
      now,
    )
  const row = asRow(getDb().prepare("SELECT * FROM ca_connect_checkouts WHERE id = ?").get(input.id))
  if (!row) throw new Error("ca_connect_checkouts insert failed")
  return mapCheckout(row)
}

export function getCaConnectCheckout(id: string): CaConnectCheckoutRow | null {
  ensureCanadaConnectSchema()
  const row = asRow(getDb().prepare("SELECT * FROM ca_connect_checkouts WHERE id = ?").get(id))
  return row ? mapCheckout(row) : null
}

export function settleCaConnectCheckoutDemo(id: string): CaConnectCheckoutRow | null {
  ensureCanadaConnectSchema()
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `UPDATE ca_connect_checkouts
       SET status = 'demo_settled', live_charge = 0, demo_only = 1, settled_at = ?
       WHERE id = ?`,
    )
    .run(now, id)
  return getCaConnectCheckout(id)
}

export function listCaConnectCheckouts(tenantId: string): CaConnectCheckoutRow[] {
  ensureCanadaConnectSchema()
  return (
    getDb()
      .prepare(
        `SELECT * FROM ca_connect_checkouts WHERE tenant_id = ? ORDER BY created_at DESC`,
      )
      .all(tenantId) as Record<string, unknown>[]
  ).map(mapCheckout)
}

export function upsertCaLandlordStatement(input: {
  id: string
  tenantId: string
  periodYyyyMm: string
  statementJson: string
}): CaLandlordStatementRow {
  ensureCanadaConnectSchema()
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO ca_landlord_statements (id, tenant_id, period_yyyy_mm, statement_json, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id, period_yyyy_mm) DO UPDATE SET
         statement_json = excluded.statement_json,
         id = excluded.id`,
    )
    .run(input.id, input.tenantId, input.periodYyyyMm, input.statementJson, now)
  const row = asRow(
    getDb()
      .prepare(
        `SELECT * FROM ca_landlord_statements WHERE tenant_id = ? AND period_yyyy_mm = ?`,
      )
      .get(input.tenantId, input.periodYyyyMm),
  )
  if (!row) throw new Error("ca_landlord_statements upsert failed")
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    periodYyyyMm: String(row.period_yyyy_mm),
    statementJson: String(row.statement_json),
    createdAt: String(row.created_at),
  }
}

export function getCaLandlordStatement(
  tenantId: string,
  periodYyyyMm: string,
): CaLandlordStatementRow | null {
  ensureCanadaConnectSchema()
  const row = asRow(
    getDb()
      .prepare(
        `SELECT * FROM ca_landlord_statements WHERE tenant_id = ? AND period_yyyy_mm = ?`,
      )
      .get(tenantId, periodYyyyMm),
  )
  if (!row) return null
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    periodYyyyMm: String(row.period_yyyy_mm),
    statementJson: String(row.statement_json),
    createdAt: String(row.created_at),
  }
}

export function listCaLandlordStatements(tenantId: string): CaLandlordStatementRow[] {
  ensureCanadaConnectSchema()
  return (
    getDb()
      .prepare(
        `SELECT * FROM ca_landlord_statements WHERE tenant_id = ? ORDER BY period_yyyy_mm DESC`,
      )
      .all(tenantId) as Record<string, unknown>[]
  ).map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    periodYyyyMm: String(row.period_yyyy_mm),
    statementJson: String(row.statement_json),
    createdAt: String(row.created_at),
  }))
}

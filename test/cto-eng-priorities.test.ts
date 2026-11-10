import { afterEach, describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"
import {
  appendLedgerEntry,
  ensureAppendOnlyLedgerSchema,
  verifyAppendOnlyLedger,
} from "@/lib/audit/append-only-ledger"
import { affiliateAccrualAllowed } from "@/lib/billing/affiliate-terms"
import { featureGate, evaluateGoLiveGate } from "@/lib/billing/go-live-gate"
import { quoteLiveInvoiceTax, quotePlatformBilling } from "@/lib/billing/pricing"
import { getDb } from "@/lib/db"
import { mcpEdgeBlocked } from "@/lib/mcp/edge-gate"
import {
  adminApproveEnableProposal,
  adminRequestEnableFlag,
  ensureLegalFlagOverridesRegistered,
} from "@/lib/markets/legal-overrides"
import { legalFlag } from "@/lib/markets/legal-flags"

installTempDatabase()

describe("CTO Eng priorities (stacked on D07/D09)", () => {
  const prev = { ...process.env }
  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in prev)) delete process.env[key]
    }
    Object.assign(process.env, prev)
  })

  it("blocks MCP at edge in production/HOSTED until Eng clears", () => {
    process.env.NODE_ENV = "production"
    delete process.env.EASYRENTAL_MCP_EDGE_ALLOW
    expect(mcpEdgeBlocked()).toBe(true)
    process.env.EASYRENTAL_MCP_EDGE_ALLOW = "1"
    expect(mcpEdgeBlocked()).toBe(false)
  })

  it("keeps append-only ledger hash-chained and rejects UPDATE/DELETE", () => {
    const db = getDb()
    ensureAppendOnlyLedgerSchema(db)
    appendLedgerEntry(db, {
      domain: "compliance",
      action: "test_a",
      summary: "first",
    })
    appendLedgerEntry(db, {
      domain: "compliance",
      action: "test_b",
      summary: "second",
    })
    const verified = verifyAppendOnlyLedger(db)
    expect(verified.ok).toBe(true)
    if (verified.ok) expect(verified.entries).toBeGreaterThanOrEqual(2)

    expect(() =>
      db.prepare("UPDATE append_only_audit_ledger SET summary = 'tamper' WHERE seq = 1").run(),
    ).toThrow(/append-only/i)
    expect(() =>
      db.prepare("DELETE FROM append_only_audit_ledger WHERE seq = 1").run(),
    ).toThrow(/append-only/i)
  })

  it("gates affiliate accrual behind affiliate flag (default OFF)", () => {
    expect(affiliateAccrualAllowed()).toBe(false)
    expect(legalFlag("CA", "affiliate")).toBe(false)
  })

  it("requires feature evidence for billing webhook settle (non-demo)", () => {
    const closed = featureGate("billing_webhook_settle")
    expect(closed.allowed).toBe(false)
    expect(closed.blockers.length).toBeGreaterThan(0)
    const open = featureGate("billing_webhook_settle", {
      live_tax_rates: true,
      signed_stripe_agreement: true,
      test_invoice_tax_lines: true,
      no_route_splits_confirmed: true,
    })
    expect(open.allowed).toBe(true)
  })

  it("requires second approver for non-money legal flags", () => {
    ensureLegalFlagOverridesRegistered()
    const propose = adminRequestEnableFlag({
      iso: "CA",
      key: "onStandardLeaseLive",
      actorUserId: "u_a",
    })
    expect(propose.ok).toBe(true)
    const proposalId = propose.ok ? propose.proposalId! : ""
    expect(legalFlag("CA", "onStandardLeaseLive")).toBe(false)
    const self = adminApproveEnableProposal({
      proposalId,
      actorUserId: "u_a",
    })
    expect(self.ok).toBe(false)
    if (!self.ok) expect(self.code).toBe("self_approval")
    const peer = adminApproveEnableProposal({
      proposalId,
      actorUserId: "u_b",
    })
    expect(peer.ok).toBe(true)
    expect(legalFlag("CA", "onStandardLeaseLive")).toBe(true)
  })

  it("does not apply fixed 18% GST on live invoices when adapters/evidence OFF", () => {
    const live = quoteLiveInvoiceTax({
      exclusiveMinor: 10_000_00,
      customer: { country: "IN", kind: "consumer" },
    })
    expect(live.taxMinor).toBe(0)
    const catalogue = quotePlatformBilling({
      mix: [{ segment: "homes", count: 1 }],
      cadence: "monthly",
      catalogueDisplayGst: true,
    })
    expect(catalogue.gstPaise).toBeGreaterThan(0)
    const noDisplay = quotePlatformBilling({
      mix: [{ segment: "homes", count: 1 }],
      cadence: "monthly",
    })
    expect(noDisplay.gstPaise).toBe(0)
  })

  it("exposes no global go-live switch on gate result", () => {
    const gate = evaluateGoLiveGate()
    expect(gate.globalGoLiveSwitch).toBe(false)
    expect(featureGate("rent_collection").allowed).toBe(false)
    expect(featureGate("deposit_holding").allowed).toBe(false)
  })
})

import { describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"
import {
  COMPLIANCE_PROPOSAL_TTL_MS,
  GO_LIVE_BLOCKERS,
  INDIA_COMPLIANCE_PARKED,
  PAY_PLANE_ENV_KEYS,
  PAY_PLANE_FLAG_IDS,
  TENANT_CARD_FEE_POLICY_LABEL,
} from "@/lib/markets/compliance-catalog"
import { legalFlag } from "@/lib/markets/legal-flags"
import {
  adminApproveEnableProposal,
  adminDisableFlag,
  adminListConsoleCompliance,
  adminRequestEnableFlag,
  ensureLegalFlagOverridesRegistered,
  expireStaleComplianceProposals,
  exportComplianceAuditCsv,
  listComplianceAudit,
  listPendingComplianceProposals,
  readPayPlaneFlag,
} from "@/lib/markets/legal-overrides"
import { dataResidencyDeclarative } from "@/lib/markets/enforce"
import { getDb } from "@/lib/db"

installTempDatabase()

describe("admin compliance console (ER-47 / Aloke Legal+CFO)", () => {
  it("lists CA focus first; IN money parked OFF; hard-locks CA tenant card fee with policy label", () => {
    ensureLegalFlagOverridesRegistered()
    expect(INDIA_COMPLIANCE_PARKED).toBe(true)
    const rows = adminListConsoleCompliance(["CA", "IN"])
    expect(rows[0]?.iso).toBe("CA")
    expect(rows.some((r) => r.key === "ontarioConnectDirectPad" && r.iso === "CA" && !r.effective)).toBe(
      true,
    )
    expect(rows.some((r) => r.key === "ca-pay" && r.iso === "CA" && !r.effective && r.payPlane)).toBe(
      true,
    )
    const inMoney = rows.filter((r) => r.iso === "IN" && r.money)
    expect(inMoney.length).toBeGreaterThan(0)
    for (const row of inMoney) {
      expect(row.effective).toBe(false)
      expect(row.indiaParked).toBe(true)
    }
    expect(rows.some((r) => r.key === "in-pay" && r.iso === "IN" && r.indiaParked && !r.effective)).toBe(
      true,
    )
    const locked = rows.find((r) => r.key === "caTenantCardFee" && r.iso === "CA")
    expect(locked?.hardLocked).toBe(true)
    expect(locked?.effective).toBe(false)
    expect(locked?.blurb?.startsWith(TENANT_CARD_FEE_POLICY_LABEL)).toBe(true)
    for (const row of rows.filter((r) => !r.hardLocked)) {
      expect(row.signOffs.length).toBeGreaterThan(0)
    }
  })

  it("rejects India money enable while parked (no enable path)", () => {
    ensureLegalFlagOverridesRegistered()
    const blocked = adminRequestEnableFlag({
      iso: "IN",
      key: "razorpayIndianEntity",
      actorUserId: "u_platform_admin",
    })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.code).toBe("india_parked")
    expect(
      adminRequestEnableFlag({ iso: "IN", key: "in-pay", actorUserId: "u_platform_admin" }).ok,
    ).toBe(false)
  })

  it("blocks self-approval on money enables; peer can approve; kill-switch OFF is instant", () => {
    ensureLegalFlagOverridesRegistered()
    const propose = adminRequestEnableFlag({
      iso: "CA",
      key: "ontarioConnectDirectPad",
      actorUserId: "u_platform_admin",
    })
    expect(propose.ok).toBe(true)
    expect(propose.ok && propose.proposalId).toBeTruthy()
    const proposalId = propose.ok ? propose.proposalId! : ""
    const self = adminApproveEnableProposal({
      proposalId,
      actorUserId: "u_platform_admin",
    })
    expect(self.ok).toBe(false)
    if (!self.ok) expect(self.code).toBe("self_approval")
    expect(legalFlag("CA", "ontarioConnectDirectPad")).toBe(false)

    const peer = adminApproveEnableProposal({
      proposalId,
      actorUserId: "u_platform_l1",
    })
    expect(peer.ok).toBe(true)
    expect(legalFlag("CA", "ontarioConnectDirectPad")).toBe(true)

    const kill = adminDisableFlag({
      iso: "CA",
      key: "ontarioConnectDirectPad",
      actorUserId: "u_platform_admin",
    })
    expect(kill.ok).toBe(true)
    expect(legalFlag("CA", "ontarioConnectDirectPad")).toBe(false)
    const audit = listComplianceAudit(10)
    expect(audit.some((e) => e.action === "kill_switch_off")).toBe(true)
    expect(
      audit.some(
        (e) =>
          e.action === "approve_enable" &&
          e.actorUserId === "u_platform_l1" &&
          e.peerUserId === "u_platform_admin",
      ),
    ).toBe(true)
  })

  it("expires money enable proposals after 24h", () => {
    ensureLegalFlagOverridesRegistered()
    const propose = adminRequestEnableFlag({
      iso: "CA",
      key: "caStripeTaxHst",
      actorUserId: "u_a",
    })
    expect(propose.ok).toBe(true)
    const proposalId = propose.ok ? propose.proposalId! : ""
    const stale = new Date(Date.now() - COMPLIANCE_PROPOSAL_TTL_MS - 60_000).toISOString()
    getDb()
      .prepare(`UPDATE compliance_flag_proposals SET created_at = ? WHERE id = ?`)
      .run(stale, proposalId)

    const expired = expireStaleComplianceProposals()
    expect(expired).toBeGreaterThanOrEqual(1)
    expect(listPendingComplianceProposals("CA").some((p) => p.id === proposalId)).toBe(false)
    const late = adminApproveEnableProposal({
      proposalId,
      actorUserId: "u_b",
    })
    expect(late.ok).toBe(false)
    if (!late.ok) expect(late.code).toBe("not_pending")
  })

  it("uses host-rail ids in-pay / ca-pay; CA ca-pay dual-control; IN in-pay parked", () => {
    expect(PAY_PLANE_FLAG_IDS).toEqual(["in-pay", "ca-pay"])
    expect(PAY_PLANE_ENV_KEYS["in-pay"]).toBe("EASYRENTAL_FLAG_IN_PAY")
    expect(PAY_PLANE_ENV_KEYS["ca-pay"]).toBe("EASYRENTAL_FLAG_CA_PAY")
    expect(readPayPlaneFlag("in-pay")).toBe(false)
    expect(readPayPlaneFlag("ca-pay")).toBe(false)

    expect(
      adminRequestEnableFlag({ iso: "IN", key: "in-pay", actorUserId: "u_a" }).ok,
    ).toBe(false)

    const propose = adminRequestEnableFlag({
      iso: "CA",
      key: "ca-pay",
      actorUserId: "u_a",
    })
    expect(propose.ok).toBe(true)
    expect(listPendingComplianceProposals("CA").some((p) => p.flagKey === "ca-pay")).toBe(true)
    const proposalId = propose.ok ? propose.proposalId! : ""
    expect(adminApproveEnableProposal({ proposalId, actorUserId: "u_a" }).ok).toBe(false)
    expect(adminApproveEnableProposal({ proposalId, actorUserId: "u_b" }).ok).toBe(true)
    expect(readPayPlaneFlag("ca-pay")).toBe(true)
    adminDisableFlag({ iso: "CA", key: "ca-pay", actorUserId: "u_b" })
    expect(readPayPlaneFlag("ca-pay")).toBe(false)
  })

  it("keeps dataResidency as demo declaration: target vs actual unverified", () => {
    const r = dataResidencyDeclarative("CA")
    expect(r.declarative).toBe(true)
    expect(r.enforcedByStorage).toBe(false)
    expect(r.targetLocation).toBeTruthy()
    expect(r.actualLocation).toBe("unverified")
  })

  it("exports UTF-8 CSV audit with required columns, hash, and row count", () => {
    ensureLegalFlagOverridesRegistered()
    adminRequestEnableFlag({
      iso: "CA",
      key: "depositHolds",
      actorUserId: "u_export_actor",
    })
    const exported = exportComplianceAuditCsv()
    expect(exported.rowCount).toBeGreaterThan(0)
    expect(exported.exportHash.startsWith("sha256:")).toBe(true)
    expect(exported.csv.startsWith("event_id,created_at_utc,actor,approver,action,")).toBe(true)
    expect(exported.csv).toContain("account_landlord")
    expect(exported.csv).toContain("stripe_razorpay_ref")
    expect(exported.csv).toContain(",amount,currency,tax,status")
    expect(exported.csv).toContain(`# row_count=${exported.rowCount}`)
    expect(exported.csv).toContain(`# export_hash=${exported.exportHash}`)
    const ranged = exportComplianceAuditCsv({
      fromUtc: "2099-01-01T00:00:00.000Z",
      toUtc: "2099-01-02T00:00:00.000Z",
    })
    expect(ranged.rowCount).toBe(0)
  })

  it("keeps go-live blockers listed and unchecked (never done in console)", () => {
    expect(GO_LIVE_BLOCKERS).toEqual([
      "Ontario lawyer written review",
      "Stripe money-flow doc plus RPAA/FINTRAC determination",
      "Listing rights",
      "RTA and privacy controls demonstrated",
    ])
  })
})

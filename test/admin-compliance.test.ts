import { describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"
import {
  INDIA_COMPLIANCE_PARKED,
  PAY_PLANE_ENV_KEYS,
  PAY_PLANE_FLAG_IDS,
} from "@/lib/markets/compliance-catalog"
import { legalFlag } from "@/lib/markets/legal-flags"
import {
  adminApproveEnableProposal,
  adminDisableFlag,
  adminListConsoleCompliance,
  adminRequestEnableFlag,
  ensureLegalFlagOverridesRegistered,
  listPendingComplianceProposals,
  readPayPlaneFlag,
} from "@/lib/markets/legal-overrides"
import { dataResidencyDeclarative } from "@/lib/markets/enforce"

installTempDatabase()

describe("admin compliance console (ER-47)", () => {
  it("lists CA focus first; IN money parked OFF; hard-locks CA tenant card fee", () => {
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
    for (const row of rows.filter((r) => !r.hardLocked)) {
      expect(row.signOffs.length).toBeGreaterThan(0)
    }
  })

  it("rejects India money enable while parked", () => {
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

  it("blocks self-approval on money enables; peer can approve", () => {
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

    adminDisableFlag({
      iso: "CA",
      key: "ontarioConnectDirectPad",
      actorUserId: "u_platform_admin",
    })
    expect(legalFlag("CA", "ontarioConnectDirectPad")).toBe(false)
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

  it("keeps dataResidency declarative (not enforced by storage)", () => {
    const r = dataResidencyDeclarative("CA")
    expect(r.declarative).toBe(true)
    expect(r.enforcedByStorage).toBe(false)
  })
})

import { beforeEach, describe, expect, it } from "vitest"
import { useTempDatabase } from "./helpers/temp-db"
import {
  assertDualControlApprove,
  demoSession,
  invokeMcpTool,
  proposalBindingHash,
  DUAL_CONTROL_APPROVER_DAILY_CAP_CAD_CENTS,
} from "@/lib/mcp"
import { exportDualControlAuditCsv, getProposal } from "@/lib/agentic"

useTempDatabase()

async function bootDb() {
  const { closeDatabase, getDb } = await import("@/lib/db")
  closeDatabase()
  getDb()
}

describe("D09 dual-control expiry / binding / race / CAD / audit", () => {
  beforeEach(async () => {
    await bootDb()
  })

  it("rejects approve when expected binding hash mismatches", () => {
    const nadia = demoSession("u_nadia")
    const proposed = invokeMcpTool(nadia, "propose_job_assignment", {
      prompt: "binding mismatch",
      propertyId: "p_waterman",
    })
    const proposalId = (proposed.data as { proposal_id: string }).proposal_id
    const kiran = demoSession("u_kiran")
    const bad = invokeMcpTool(kiran, "approvals.resolve", {
      proposal_id: proposalId,
      decision: "approve",
      expected_binding_hash: "deadbeef",
    })
    expect(bad.ok).toBe(false)
    expect((bad.data as { code?: string })?.code).toBe("binding_mismatch")
  })

  it("accepts approve when expected binding hash matches", async () => {
    const { jobsForTenant } = await import("@/lib/db")
    const before = jobsForTenant("t_bbm").length
    const nadia = demoSession("u_nadia")
    const proposed = invokeMcpTool(nadia, "propose_job_assignment", {
      prompt: "binding match",
      propertyId: "p_waterman",
    })
    const proposalId = (proposed.data as { proposal_id: string }).proposal_id
    const proposal = getProposal("t_bbm", proposalId)!
    const hash = proposalBindingHash(proposal)
    const kiran = demoSession("u_kiran")
    const ok = invokeMcpTool(kiran, "approvals.resolve", {
      proposal_id: proposalId,
      decision: "approve",
      expected_binding_hash: hash,
    })
    expect(ok.ok).toBe(true)
    expect(jobsForTenant("t_bbm").length).toBe(before + 1)
  })

  it("blocks expired never-auto proposals", () => {
    const nadia = demoSession("u_nadia")
    const proposed = invokeMcpTool(nadia, "propose_job_assignment", {
      prompt: "expire me",
      propertyId: "p_waterman",
    })
    const proposalId = (proposed.data as { proposal_id: string }).proposal_id
    const proposal = getProposal("t_bbm", proposalId)!
    const expired = {
      ...proposal,
      expiresAt: "2000-01-01T00:00:00.000Z",
    }
    const dual = assertDualControlApprove(expired, "u_kiran", {
      nowIso: "2026-11-07T00:00:00.000Z",
    })
    expect(dual.ok).toBe(false)
    if (dual.ok) return
    expect(dual.code).toBe("expired")
  })

  it("blocks replay when status is no longer pending", () => {
    const nadia = demoSession("u_nadia")
    const proposed = invokeMcpTool(nadia, "propose_job_assignment", {
      prompt: "replay",
      propertyId: "p_waterman",
    })
    const proposalId = (proposed.data as { proposal_id: string }).proposal_id
    const kiran = demoSession("u_kiran")
    expect(
      invokeMcpTool(kiran, "approvals.resolve", {
        proposal_id: proposalId,
        decision: "approve",
      }).ok,
    ).toBe(true)

    const again = invokeMcpTool(kiran, "approvals.resolve", {
      proposal_id: proposalId,
      decision: "approve",
    })
    expect(again.ok).toBe(false)
  })

  it("enforces CAD 2k/day approver cap when amount known", () => {
    const nadia = demoSession("u_nadia")
    const proposed = invokeMcpTool(nadia, "propose_upsert_occupant_ledger", {
      prompt: "large rent seed",
      propertyId: "p_waterman",
      unitId: "u_waterman_b1",
      name: "Maya Chen",
      email: "maya@apexlogistics.example",
      seedRentCents: DUAL_CONTROL_APPROVER_DAILY_CAP_CAD_CENTS + 1,
    })
    expect(proposed.ok).toBe(true)
    const proposalId = (proposed.data as { proposal_id: string }).proposal_id
    const proposal = getProposal("t_bbm", proposalId)!
    const dual = assertDualControlApprove(proposal, "u_kiran", {
      alreadyApprovedCadCentsToday: 0,
    })
    expect(dual.ok).toBe(false)
    if (dual.ok) return
    expect(dual.code).toBe("daily_cap")
  })

  it("exports books-exportable dual-control CSV with binding hash", () => {
    const nadia = demoSession("u_nadia")
    const proposed = invokeMcpTool(nadia, "propose_job_assignment", {
      prompt: "audit csv",
      propertyId: "p_waterman",
    })
    const proposalId = (proposed.data as { proposal_id: string }).proposal_id
    const kiran = demoSession("u_kiran")
    invokeMcpTool(kiran, "approvals.resolve", {
      proposal_id: proposalId,
      decision: "approve",
    })

    const csv = exportDualControlAuditCsv("t_bbm")
    expect(csv).toContain("binding_hash")
    expect(csv).toContain("finance_policy_version")
    expect(csv).toContain(proposalId)
    expect(csv).toContain("u_kiran")
  })
})

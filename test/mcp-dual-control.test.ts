import { beforeEach, describe, expect, it } from "vitest"
import { useTempDatabase } from "./helpers/temp-db"
import {
  assertDistinctApprover,
  demoSession,
  invokeMcpTool,
  proposalBindingHash,
} from "@/lib/mcp"

useTempDatabase()

async function bootDb() {
  const { closeDatabase, getDb } = await import("@/lib/db")
  closeDatabase()
  getDb()
}

describe("D09 dual-control approvals (CTO gate)", () => {
  beforeEach(async () => {
    await bootDb()
  })

  it("blocks self-approval on never-auto propose_job_assignment", () => {
    const nadia = demoSession("u_nadia")
    const proposed = invokeMcpTool(nadia, "propose_job_assignment", {
      prompt: "Assign electrician for dual-control test",
      propertyId: "p_waterman",
    })
    expect(proposed.ok).toBe(true)
    const proposalId = (proposed.data as { proposal_id: string }).proposal_id

    const self = invokeMcpTool(nadia, "approvals.resolve", {
      proposal_id: proposalId,
      decision: "approve",
    })
    expect(self.ok).toBe(false)
    expect(self.error).toMatch(/self-approval/i)
    expect((self.data as { code?: string })?.code).toBe("self_approval")
  })

  it("allows distinct landlord peer to approve with binding hash", async () => {
    const { jobsForTenant } = await import("@/lib/db")
    const { auditEventsForTenant } = await import("@/lib/agentic")
    const before = jobsForTenant("t_bbm").length

    const nadia = demoSession("u_nadia")
    const kiran = demoSession("u_kiran")
    expect(kiran.tenantId).toBe("t_bbm")

    const proposed = invokeMcpTool(nadia, "propose_job_assignment", {
      prompt: "Assign electrician for peer approve",
      propertyId: "p_waterman",
    })
    expect(proposed.ok).toBe(true)
    const proposalId = (proposed.data as { proposal_id: string }).proposal_id

    const approved = invokeMcpTool(kiran, "approvals.resolve", {
      proposal_id: proposalId,
      decision: "approve",
    })
    expect(approved.ok).toBe(true)
    const data = approved.data as {
      binding_hash: string
      created_by: string
      decided_by: string
    }
    expect(data.binding_hash).toMatch(/^(sha256:)?[a-f0-9]+$/i)
    expect(data.created_by).toBe("u_nadia")
    expect(data.decided_by).toBe("u_kiran")
    expect(jobsForTenant("t_bbm").length).toBe(before + 1)

    const audits = auditEventsForTenant("t_bbm", 20)
    const approveEvt = audits.find((e) => e.kind === "approve" && e.proposalId === proposalId)
    expect(approveEvt?.detailJson).toMatch(/bindingHash/)
    expect(approveEvt?.actorUserId).toBe("u_kiran")
  })

  it("still allows creator to reject (no side effects)", async () => {
    const { jobsForTenant } = await import("@/lib/db")
    const before = jobsForTenant("t_bbm").length
    const nadia = demoSession("u_nadia")
    const proposed = invokeMcpTool(nadia, "propose_job_assignment", {
      prompt: "Assign electrician then reject",
      propertyId: "p_waterman",
    })
    const proposalId = (proposed.data as { proposal_id: string }).proposal_id
    const rejected = invokeMcpTool(nadia, "approvals.resolve", {
      proposal_id: proposalId,
      decision: "reject",
    })
    expect(rejected.ok).toBe(true)
    expect(jobsForTenant("t_bbm").length).toBe(before)
  })

  it("binding hash changes when payload is edited", async () => {
    const { getProposal } = await import("@/lib/agentic")
    const nadia = demoSession("u_nadia")
    const proposed = invokeMcpTool(nadia, "propose_list_unit", {
      prompt: "list B1",
      propertyId: "p_waterman",
      unitId: "u_waterman_b1",
    })
    const proposalId = (proposed.data as { proposal_id: string }).proposal_id
    const before = getProposal("t_bbm", proposalId)!
    const hashBefore = proposalBindingHash(before)

    const edited = invokeMcpTool(nadia, "approvals.resolve", {
      proposal_id: proposalId,
      decision: "edit",
      payload: { ...before.payload, prompt: "list B1 (edited)" },
      prompt: "list B1 (edited)",
    })
    expect(edited.ok).toBe(true)
    const after = getProposal("t_bbm", proposalId)!
    expect(proposalBindingHash(after)).not.toBe(hashBefore)

    const dual = assertDistinctApprover(after, "u_nadia")
    expect(dual.ok).toBe(false)
  })
})

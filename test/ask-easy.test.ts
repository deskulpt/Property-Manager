import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"

installTempDatabase()

async function db() {
  return import("@/lib/db")
}

async function agentic() {
  return import("@/lib/agentic")
}

describe("Ask Easy — ADK tools + approval hard gate", () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
    for (const key of ["ASK_EASY_MODEL_API_KEY", "ASK_EASY_MODEL_URL", "ASK_EASY_REQUIRE_PRO"]) {
      savedEnv[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it("stub autofill writes an unpublished listing draft only (no network LLM)", async () => {
    const { runStubAskEasy, listingDraftsForTenant, publishListingDraft, liveModelConfigured } =
      await agentic()
    const { getDb } = await db()

    expect(liveModelConfigured()).toBe(false)

    const result = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Draft listing copy for the north drive-in bay with dock access",
      propertyId: "p_waterman",
      unitId: "u_waterman_b1",
    })
    expect(result.kind).toBe("draft_listing")
    expect(result.modelProvider).toBe("stub")
    if (result.kind !== "draft_listing") return

    expect(result.draft.published).toBe(false)
    const drafts = listingDraftsForTenant("t_bbm")
    expect(drafts.some((d) => d.id === result.draft.id && d.published === false)).toBe(true)

    const publishedFlag = getDb()
      .prepare("SELECT published FROM listing_drafts WHERE id = ?")
      .get(result.draft.id) as { published: number }
    expect(publishedFlag.published).toBe(0)

    const blocked = publishListingDraft("t_bbm", result.draft.id)
    expect(blocked.ok).toBe(false)
  })

  it("reject leaves no job; approve mutates exactly once", async () => {
    const {
      runStubAskEasy,
      pendingProposals,
      executeApprovedProposal,
      approveProposal,
      rejectProposal,
    } = await agentic()
    const { getDb, jobsForTenant } = await db()

    const beforeJobs = jobsForTenant("t_bbm").length

    const result = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Assign an electrician to fix the weather seal on the north drive-in",
      propertyId: "p_waterman",
    })
    expect(result.kind).toBe("propose_job_assignment")
    if (result.kind !== "propose_job_assignment") return

    expect(result.proposal.status).toBe("pending")
    expect(pendingProposals("t_bbm").some((p) => p.id === result.proposal.id)).toBe(true)
    expect(jobsForTenant("t_bbm")).toHaveLength(beforeJobs)

    // HARD GATE: execute while pending must fail and leave jobs unchanged
    const unapproved = executeApprovedProposal({
      tenantId: "t_bbm",
      proposalId: result.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(unapproved.ok).toBe(false)
    if (!unapproved.ok) expect(unapproved.code).toBe("not_approved")
    expect(jobsForTenant("t_bbm")).toHaveLength(beforeJobs)

    // Reject → still no job
    const rejected = rejectProposal({
      tenantId: "t_bbm",
      proposalId: result.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(rejected.ok).toBe(true)
    expect(jobsForTenant("t_bbm")).toHaveLength(beforeJobs)

    // Fresh proposal → approve creates job + notify exactly once
    const again = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Assign electrician for panel labels at the hub",
      propertyId: "p_waterman",
    })
    expect(again.kind).toBe("propose_job_assignment")
    if (again.kind !== "propose_job_assignment") return

    const providerId =
      "providerId" in again.proposal.payload ? again.proposal.payload.providerId : ""

    const approved = approveProposal({
      tenantId: "t_bbm",
      proposalId: again.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(approved.ok).toBe(true)
    if (!approved.ok) return
    expect(approved.jobId).toBeTruthy()
    expect(jobsForTenant("t_bbm").length).toBe(beforeJobs + 1)

    // Second approve / re-execute must not create another job
    const againApprove = approveProposal({
      tenantId: "t_bbm",
      proposalId: again.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(againApprove.ok).toBe(false)
    const againExec = executeApprovedProposal({
      tenantId: "t_bbm",
      proposalId: again.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(againExec.ok).toBe(false)
    expect(jobsForTenant("t_bbm").length).toBe(beforeJobs + 1)

    const note = getDb()
      .prepare(
        `SELECT title FROM notifications WHERE user_id = ? AND title = 'Concierge job assigned'
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(providerId) as { title?: string } | undefined
    expect(note?.title).toBe("Concierge job assigned")
  })

  it("live model missing/unreachable falls back to stub without throwing", async () => {
    const { runAskEasy, liveModelConfigured } = await agentic()

    process.env.ASK_EASY_MODEL_API_KEY = "test-key-not-real"
    process.env.ASK_EASY_MODEL_URL = "http://127.0.0.1:9/v1/chat/completions"
    expect(liveModelConfigured()).toBe(true)

    const result = await runAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Draft listing copy for the north drive-in bay",
      propertyId: "p_waterman",
      unitId: "u_waterman_b1",
    })
    expect(result.kind).toBe("draft_listing")
    expect(result.modelProvider).toBe("stub")
    expect(result.modelNote.toLowerCase()).toMatch(/fallback|stub/)
  })

  it("tool registry exposes mutating tools as approval-required", async () => {
    const { ASK_EASY_TOOLS, getTool } = await agentic()
    const job = getTool("propose_job_assignment")
    expect(job?.mutating).toBe(true)
    expect(job?.requiresApproval).toBe(true)
    expect(ASK_EASY_TOOLS.some((t) => t.name === "draft_listing")).toBe(true)
  })

  it("Harbourline cannot approve or execute a BBM proposal", async () => {
    const { runStubAskEasy, approveProposal, executeApprovedProposal, getProposal } = await agentic()

    const result = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Assign plumber for sump work",
      propertyId: "p_waterman",
    })
    if (result.kind === "error") {
      const retry = runStubAskEasy({
        tenantId: "t_bbm",
        userId: "u_nadia",
        prompt: "Assign electrician for weather seal",
        propertyId: "p_waterman",
      })
      expect(retry.kind).toBe("propose_job_assignment")
      if (retry.kind !== "propose_job_assignment") return
      expect(getProposal("t_harbour", retry.proposal.id)).toBeNull()
      const crossApprove = approveProposal({
        tenantId: "t_harbour",
        proposalId: retry.proposal.id,
        actorUserId: "u_jonah",
      })
      expect(crossApprove.ok).toBe(false)
      const crossExec = executeApprovedProposal({
        tenantId: "t_harbour",
        proposalId: retry.proposal.id,
        actorUserId: "u_jonah",
      })
      expect(crossExec.ok).toBe(false)
      return
    }
    expect(result.kind).toBe("propose_job_assignment")
    if (result.kind !== "propose_job_assignment") return
    expect(getProposal("t_harbour", result.proposal.id)).toBeNull()
    expect(
      approveProposal({
        tenantId: "t_harbour",
        proposalId: result.proposal.id,
        actorUserId: "u_jonah",
      }).ok,
    ).toBe(false)
  })

  it("audit log records prompt → propose → reject without execute", async () => {
    const { runStubAskEasy, rejectProposal, auditEventsForTenant } = await agentic()
    const turn = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Assign electrician for dock leveler",
      propertyId: "p_waterman",
    })
    expect(turn.kind).toBe("propose_job_assignment")
    if (turn.kind !== "propose_job_assignment") return
    rejectProposal({
      tenantId: "t_bbm",
      proposalId: turn.proposal.id,
      actorUserId: "u_nadia",
    })
    const kinds = auditEventsForTenant("t_bbm").map((e) => e.kind)
    expect(kinds).toContain("prompt")
    expect(kinds).toContain("propose")
    expect(kinds).toContain("reject")
    expect(kinds).not.toContain("execute")
  })

  it("soft Pro gate opens Ask Easy when subscription_package column is absent", async () => {
    const { tenantHasAskEasy } = await agentic()
    expect(tenantHasAskEasy("t_bbm")).toBe(true)
  })
})

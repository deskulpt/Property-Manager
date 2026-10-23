import { beforeEach, describe, expect, it } from "vitest"
import { useTempDatabase } from "./helpers/temp-db"
import {
  canInvokeTool,
  demoSession,
  invokeMcpTool,
  isNeverAuto,
  MCP_PROPOSE_SCOPE,
  maySilentExecute,
  toolsForSession,
} from "@/lib/mcp"

useTempDatabase()

async function bootDb() {
  const { closeDatabase, getDb } = await import("@/lib/db")
  closeDatabase()
  getDb()
}

describe("MCP M1 propose + approvals", () => {
  beforeEach(async () => {
    await bootDb()
  })

  it("landlord session gets propose:* and mutate + approvals tools", () => {
    const session = demoSession("u_nadia")
    expect(session.scopes).toContain(MCP_PROPOSE_SCOPE)
    const names = toolsForSession(session).map((t) => t.name)
    expect(names).toContain("propose_job_assignment")
    expect(names).toContain("propose_esign_send")
    expect(names).toContain("propose_upsert_occupant_ledger")
    expect(names).toContain("approvals.list")
    expect(names).toContain("approvals.resolve")
    expect(canInvokeTool(session, "propose_job_assignment")).toBe(true)
  })

  it("applicant / anonymous cannot invoke mutate or approvals", () => {
    const maya = demoSession("u_maya")
    expect(maya.scopes).not.toContain(MCP_PROPOSE_SCOPE)
    expect(canInvokeTool(maya, "propose_job_assignment")).toBe(false)
    expect(canInvokeTool(maya, "approvals.resolve")).toBe(false)
    const denied = invokeMcpTool(maya, "propose_job_assignment", {
      prompt: "assign electrician",
    })
    expect(denied.ok).toBe(false)
  })

  it("never-auto policy blocks silent execute even with preauth scope", () => {
    expect(isNeverAuto("propose_job_assignment")).toBe(true)
    expect(isNeverAuto("propose_esign_send")).toBe(true)
    expect(isNeverAuto("propose_upsert_occupant_ledger")).toBe(true)
    expect(isNeverAuto("propose_list_unit")).toBe(true)
    expect(isNeverAuto("draft_listing")).toBe(false)
    expect(maySilentExecute("propose_job_assignment", ["execute:preauthorized"])).toBe(false)
    expect(maySilentExecute("propose_esign_send", ["execute:preauthorized"])).toBe(false)
    expect(maySilentExecute("draft_listing", ["execute:preauthorized"])).toBe(true)
  })

  it("propose_job_assignment returns proposal_id and does not create a job", async () => {
    const { jobsForTenant } = await import("@/lib/db")
    const session = demoSession("u_nadia")
    const before = jobsForTenant("t_bbm").length

    const result = invokeMcpTool(session, "propose_job_assignment", {
      prompt: "Assign an electrician to fix the weather seal on the north drive-in",
      propertyId: "p_waterman",
    })
    expect(result.ok).toBe(true)
    const data = result.data as {
      proposal_id: string
      status: string
      never_auto: boolean
      preview: string
    }
    expect(data.proposal_id).toMatch(/^[0-9a-f-]{36}$/i)
    expect(data.status).toBe("pending")
    expect(data.never_auto).toBe(true)
    expect(data.preview.length).toBeGreaterThan(10)
    expect(jobsForTenant("t_bbm")).toHaveLength(before)

    const listed = invokeMcpTool(session, "approvals.list", { status: "pending" })
    expect(listed.ok).toBe(true)
    const listData = listed.data as { proposals: { proposal_id: string }[] }
    expect(listData.proposals.some((p) => p.proposal_id === data.proposal_id)).toBe(true)
  })

  it("approvals.resolve reject = no side effect; approve mutates once", async () => {
    const { jobsForTenant, getDb } = await import("@/lib/db")
    const session = demoSession("u_nadia")
    const before = jobsForTenant("t_bbm").length

    const proposed = invokeMcpTool(session, "propose_job_assignment", {
      prompt: "Assign electrician for panel labels at the hub",
      propertyId: "p_waterman",
    })
    expect(proposed.ok).toBe(true)
    const proposalId = (proposed.data as { proposal_id: string }).proposal_id

    const rejected = invokeMcpTool(session, "approvals.resolve", {
      proposal_id: proposalId,
      decision: "reject",
    })
    expect(rejected.ok).toBe(true)
    expect(jobsForTenant("t_bbm")).toHaveLength(before)

    const again = invokeMcpTool(session, "propose_job_assignment", {
      prompt: "Assign electrician for dock leveler",
      propertyId: "p_waterman",
    })
    expect(again.ok).toBe(true)
    const id2 = (again.data as { proposal_id: string }).proposal_id

    const approved = invokeMcpTool(session, "approvals.resolve", {
      proposal_id: id2,
      decision: "approve",
    })
    expect(approved.ok).toBe(true)
    expect(jobsForTenant("t_bbm").length).toBe(before + 1)

    const twice = invokeMcpTool(session, "approvals.resolve", {
      proposal_id: id2,
      decision: "approve",
    })
    expect(twice.ok).toBe(false)
    expect(jobsForTenant("t_bbm").length).toBe(before + 1)

    const note = getDb()
      .prepare(
        `SELECT title FROM notifications WHERE title = 'Concierge job assigned'
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get() as { title: string } | undefined
    expect(note?.title).toBe("Concierge job assigned")
  })

  it("money propose stays pending; reject leaves ledger unchanged", async () => {
    const { getDb } = await import("@/lib/db")
    const session = demoSession("u_nadia")
    const beforeLedger = Number(
      (getDb().prepare("SELECT COUNT(*) AS c FROM ledger_entries WHERE tenant_id = ?").get("t_bbm") as {
        c: number
      }).c,
    )

    const result = invokeMcpTool(session, "propose_upsert_occupant_ledger", {
      prompt: "Add occupant Priya on B1 with rent seed",
      propertyId: "p_waterman",
      unitId: "u_waterman_b1",
      name: "Priya MCP",
      email: "priya.mcp@example.com",
    })
    expect(result.ok).toBe(true)
    const data = result.data as { proposal_id: string; never_auto: boolean; status: string }
    expect(data.never_auto).toBe(true)
    expect(data.status).toBe("pending")

    const rejected = invokeMcpTool(session, "approvals.resolve", {
      proposal_id: data.proposal_id,
      decision: "reject",
    })
    expect(rejected.ok).toBe(true)
    const afterLedger = Number(
      (getDb().prepare("SELECT COUNT(*) AS c FROM ledger_entries WHERE tenant_id = ?").get("t_bbm") as {
        c: number
      }).c,
    )
    expect(afterLedger).toBe(beforeLedger)
  })

  it("rejects model-supplied foreign tenant_id on mutate + resolve", () => {
    const session = demoSession("u_nadia")
    const mutate = invokeMcpTool(session, "propose_list_unit", {
      prompt: "list B1",
      propertyId: "p_waterman",
      unitId: "u_waterman_b1",
      tenant_id: "t_harbour",
    })
    expect(mutate.ok).toBe(false)
    expect(mutate.error).toMatch(/tenant_id may not be supplied/i)

    const resolve = invokeMcpTool(session, "approvals.resolve", {
      proposal_id: "does-not-matter",
      decision: "approve",
      tenant_id: "t_harbour",
    })
    expect(resolve.ok).toBe(false)
    expect(resolve.error).toMatch(/tenant_id may not be supplied/i)
  })

  it("cross-tenant approvals.get returns not_found", () => {
    const session = demoSession("u_nadia")
    const proposed = invokeMcpTool(session, "propose_list_unit", {
      prompt: "list unit",
      propertyId: "p_waterman",
      unitId: "u_waterman_b1",
    })
    expect(proposed.ok).toBe(true)
    const proposalId = (proposed.data as { proposal_id: string }).proposal_id

    const foreign = {
      ...session,
      tenantId: "t_other_landlord",
      userId: "u_foreign",
    }
    const got = invokeMcpTool(foreign, "approvals.get", { proposal_id: proposalId })
    expect(got.ok).toBe(false)
    expect(got.error).toBe("not_found")
  })

  it("draft_listing soft-applies unpublished and returns proposal_id", async () => {
    const { listingDraftsForTenant } = await import("@/lib/agentic")
    const session = demoSession("u_nadia")
    const result = invokeMcpTool(session, "draft_listing", {
      prompt: "Draft listing copy for the north drive-in bay",
      propertyId: "p_waterman",
      unitId: "u_waterman_b1",
    })
    expect(result.ok).toBe(true)
    const data = result.data as {
      proposal_id: string
      never_auto: boolean
      soft_draft_applied?: boolean
      detail?: { published?: boolean }
    }
    expect(data.proposal_id).toBeTruthy()
    expect(data.never_auto).toBe(false)
    expect(data.soft_draft_applied).toBe(true)
    expect(data.detail?.published).toBe(false)
    expect(listingDraftsForTenant("t_bbm").some((d) => d.published === false)).toBe(true)
  })
})

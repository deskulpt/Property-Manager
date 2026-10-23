import { beforeEach, describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"
import { getVoiceSupport } from "@/components/landlord/ask-easy-voice"

installTempDatabase()

async function agentic() {
  return import("@/lib/agentic")
}

async function db() {
  return import("@/lib/db")
}

describe("Ask Easy onboard — attribute reads + voice degrade", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
    delete process.env.ASK_EASY_MODEL_API_KEY
    delete process.env.GEMINI_API_KEY
    delete process.env.GOOGLE_GENAI_API_KEY
  })

  it("summarize_portfolio returns real BBM attributes with citations", async () => {
    const { runAskEasyStub, listListingAttributeCatalog } = await agentic()
    const turn = runAskEasyStub({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Onboard me — summarise my portfolio",
      onboard: true,
    })
    expect(turn.kind).toBe("read")
    if (turn.kind !== "read") return
    expect(turn.toolName).toBe("summarize_portfolio")
    expect(turn.reply).toMatch(/BBM|Waterman|bay/i)
    expect(turn.citations.length).toBeGreaterThan(3)
    expect(turn.citations.some((c) => c.field === "occupancy" || c.field === "unitCount")).toBe(
      true,
    )
    // Must not invent Harbourline into BBM onboard
    expect(turn.reply).not.toMatch(/Harbourline/i)
    expect(listListingAttributeCatalog().length).toBeGreaterThan(10)
  })

  it("get_unit cites real sqft and rate for Waterman B1", async () => {
    const { runAskEasyStub } = await agentic()
    const { getDb } = await db()
    const row = getDb()
      .prepare("SELECT sqft, rate_psf, code FROM units WHERE id = ? AND tenant_id = ?")
      .get("u_waterman_b1", "t_bbm") as { sqft: number; rate_psf: number; code: string }

    const turn = runAskEasyStub({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "What is the sqft, rate, and docks for unit B1?",
      propertyId: "p_waterman",
      unitId: "u_waterman_b1",
    })
    expect(turn.kind).toBe("read")
    if (turn.kind !== "read") return
    expect(turn.toolName).toBe("get_unit")
    const sqftCite = turn.citations.find((c) => c.field === "sqft")
    expect(sqftCite).toBeTruthy()
    expect(sqftCite!.value.replace(/,/g, "")).toContain(String(row.sqft))
    expect(turn.reply.replace(/,/g, "")).toContain(String(row.sqft))
    expect(turn.citations.some((c) => c.field === "ratePsf")).toBe(true)
    expect(turn.citations.some((c) => c.field === "docks")).toBe(true)
  })

  it("cross-tenant: BBM cannot read Harbourline property via get_property", async () => {
    const { dispatchTool } = await agentic()
    const result = dispatchTool("get_property", {
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Show Commissioners yard",
      propertyId: "p_commissioners",
    })
    expect(result.kind).toBe("read")
    if (result.kind !== "read") return
    // propertyForLandlord returns null → no building / empty data
    expect(result.data === null || result.reply.match(/not in this organisation|No building/i)).toBeTruthy()
    const blob = JSON.stringify(result)
    expect(blob).not.toMatch(/Harbourline/i)
  })

  it("list_units for BBM never includes foreign tenant unit ids", async () => {
    const { runAskEasyStub } = await agentic()
    const turn = runAskEasyStub({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "List my bays and availability",
      propertyId: "p_waterman",
    })
    expect(turn.kind).toBe("read")
    if (turn.kind !== "read") return
    const blob = JSON.stringify(turn.data)
    expect(blob).not.toMatch(/t_harbour|p_commissioners/i)
  })

  it("voice helpers degrade without browser SpeechRecognition (Node/test)", () => {
    const support = getVoiceSupport()
    expect(support.recognition).toBe(false)
    expect(support.synthesis).toBe(false)
  })

  it("mutating assign still requires approval (never-auto)", async () => {
    const { runAskEasyStub, executeApprovedProposal } = await agentic()
    const { jobsForTenant } = await db()
    const before = jobsForTenant("t_bbm").length
    const turn = runAskEasyStub({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Assign an electrician for the weather seal",
      propertyId: "p_waterman",
    })
    expect(turn.kind).toBe("propose_job_assignment")
    if (turn.kind !== "propose_job_assignment") return
    const blocked = executeApprovedProposal({
      tenantId: "t_bbm",
      proposalId: turn.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(blocked.ok).toBe(false)
    expect(jobsForTenant("t_bbm")).toHaveLength(before)
  })
})

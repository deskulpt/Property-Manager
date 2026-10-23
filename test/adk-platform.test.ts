import { beforeEach, describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"

installTempDatabase()

async function db() {
  return import("@/lib/db")
}

async function adk() {
  return import("@/lib/adk")
}

describe("ADK platform — tenant isolation + mock runner", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
  })

  it("mock landlord turn grounds on session tenant only", async () => {
    const { runAdkTurn } = await adk()
    const turn = await runAdkTurn({
      message: "What units are available?",
      scope: "landlord",
      tenantId: "t_bbm",
      propertyId: "p_waterman",
    })
    expect(turn.mode).toBe("mock")
    expect(turn.grounded).toBe(true)
    expect(turn.toolCalls.some((c) => c.name === "unit_availability")).toBe(true)
    const avail = turn.toolResults.find((r) => r.name === "unit_availability")
    expect(avail?.ok).toBe(true)
    const units = (avail?.data as { units: { propertyId: string }[] }).units
    expect(units.length).toBeGreaterThan(0)
    expect(units.every((u) => u.propertyId === "p_waterman")).toBe(true)
    // Harbourline property must never appear for BBM session
    const blob = JSON.stringify(turn.toolResults)
    expect(blob).not.toMatch(/p_commissioners|t_harbour|Harbourline/i)
  })

  it("property_summary refuses foreign property ids", async () => {
    const { executeAdkTool } = await adk()
    const result = executeAdkTool(
      { name: "property_summary", args: { propertyId: "p_commissioners" } },
      { scope: "landlord", tenantId: "t_bbm" },
    )
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/not found/i)
  })

  it("public scope cannot call landlord-only tools", async () => {
    const { executeAdkTool } = await adk()
    const summary = executeAdkTool(
      { name: "property_summary", args: {} },
      { scope: "public" },
    )
    expect(summary.ok).toBe(false)
    const apps = executeAdkTool(
      { name: "applications_summary", args: {} },
      { scope: "public", tenantId: "t_bbm" },
    )
    expect(apps.ok).toBe(false)
  })

  it("public search_listings returns catalog cards", async () => {
    const { runAdkTurn } = await adk()
    const turn = await runAdkTurn({
      message: "Find available bays in Bhiwandi",
      scope: "public",
    })
    expect(turn.grounded).toBe(true)
    expect(turn.toolCalls[0]?.name).toBe("search_listings")
    const search = turn.toolResults[0]
    expect(search?.ok).toBe(true)
    const listings = (search?.data as { listings: unknown[] }).listings
    expect(listings.length).toBeGreaterThan(0)
  })

  it("landlord search forces session tenant even if args try another", async () => {
    const { executeAdkTool } = await adk()
    const result = executeAdkTool(
      {
        name: "search_listings",
        args: { q: "", status: "available", tenantId: "t_harbour" },
      },
      { scope: "landlord", tenantId: "t_bbm" },
    )
    expect(result.ok).toBe(true)
    const listings = (result.data as { listings: { landlord: string }[] }).listings
    expect(listings.length).toBeGreaterThan(0)
    // Session tenant is t_bbm (DEMO · EasyRent Hyderabad) — args.tenantId ignored
    for (const card of listings) {
      expect(card.landlord).toMatch(/EasyRent Hyderabad/i)
      expect(card.landlord).not.toMatch(/Harbourline/i)
    }
  })

  it("looksLikeGroundedQuestion separates Q&A from mutation prompts", async () => {
    const { looksLikeGroundedQuestion } = await adk()
    expect(looksLikeGroundedQuestion("What units are available?")).toBe(true)
    expect(looksLikeGroundedQuestion("Summarise my applications")).toBe(true)
    expect(looksLikeGroundedQuestion("Assign an electrician for the weather seal")).toBe(false)
    expect(looksLikeGroundedQuestion("Draft listing copy for the north bay")).toBe(false)
  })
})

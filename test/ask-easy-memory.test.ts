import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"

installTempDatabase()

async function db() {
  return import("@/lib/db")
}

async function agentic() {
  return import("@/lib/agentic")
}

describe("Ask Easy L.1 — durable memory + DPDP", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
  })

  afterEach(async () => {
    const { closeDatabase } = await db()
    closeDatabase()
  })

  it("seeds per-landlord and per-property memory for demo org", async () => {
    const { listAgentMemory } = await agentic()
    const rows = listAgentMemory("t_bbm")
    expect(rows.length).toBeGreaterThanOrEqual(3)
    expect(rows.some((r) => r.propertyId == null && r.kind === "tone_pref")).toBe(true)
    expect(rows.some((r) => r.propertyId === "p_waterman" && r.kind === "issue")).toBe(true)
  })

  it("remember + list via stub tools; tenant isolation", async () => {
    const { runStubAskEasy, listAgentMemory, purgeAgentMemory } = await agentic()

    const remembered = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Remember preferred electrician Vikram for dock lighting at Waterman",
      propertyId: "p_waterman",
    })
    expect(remembered.kind).toBe("memory_remember")
    expect(remembered.toolName).toBe("memory_remember")
    if (remembered.kind !== "memory_remember") return
    expect(remembered.entry.kind).toBe("preferred_vendor")
    expect(remembered.entry.tenantId).toBe("t_bbm")

    const listed = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "What do you remember about this building?",
      propertyId: "p_waterman",
    })
    expect(listed.kind).toBe("memory_list")
    if (listed.kind !== "memory_list") return
    expect(listed.entries.some((e) => e.id === remembered.entry.id)).toBe(true)

    // Cross-tenant: other org cannot see BBM memory
    const foreign = listAgentMemory("t_deskulpt")
    expect(foreign.some((e) => e.id === remembered.entry.id)).toBe(false)

    const foreignPurge = purgeAgentMemory("t_deskulpt", { mode: "id", id: remembered.entry.id })
    expect(foreignPurge.ok).toBe(true)
    if (foreignPurge.ok) expect(foreignPurge.deleted).toBe(0)
    expect(listAgentMemory("t_bbm").some((e) => e.id === remembered.entry.id)).toBe(true)
  })

  it("DPDP: refuse Aadhaar images and raw Aadhaar numbers", async () => {
    const { assertMemoryContentAllowed, upsertAgentMemory, runStubAskEasy } = await agentic()

    expect(
      assertMemoryContentAllowed({
        title: "KYC",
        body: "Attach Aadhaar image scan from applicant",
      }).ok,
    ).toBe(false)

    expect(
      assertMemoryContentAllowed({
        title: "ID",
        body: "Aadhaar 2345 6789 0123 on file",
      }).ok,
    ).toBe(false)

    expect(
      assertMemoryContentAllowed({
        title: "Card",
        body: "Card 4111 1111 1111 1111",
      }).ok,
    ).toBe(false)

    expect(
      assertMemoryContentAllowed({
        title: "Preferred vendor",
        body: "Use Vikram for dock lighting",
      }).ok,
    ).toBe(true)

    const blocked = upsertAgentMemory({
      tenantId: "t_bbm",
      propertyId: "p_waterman",
      kind: "other",
      title: "Aadhaar upload",
      body: "Store Aadhaar photo jpg for Maya",
      createdBy: "u_nadia",
    })
    expect(blocked.ok).toBe(false)

    const stubBlocked = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Remember Aadhaar image 2345-6789-0123 for the applicant",
      propertyId: "p_waterman",
    })
    expect(stubBlocked.kind).toBe("error")
  })

  it("purge by id / property / all; audit kinds", async () => {
    const { upsertAgentMemory, purgeAgentMemory, listAgentMemory, auditEventsForTenant } =
      await agentic()

    const a = upsertAgentMemory({
      tenantId: "t_bbm",
      propertyId: "p_waterman",
      kind: "issue",
      title: "Temp leak",
      body: "Roof drip near bay B2 after rain",
      createdBy: "u_nadia",
    })
    expect(a.ok).toBe(true)
    if (!a.ok) return

    const one = purgeAgentMemory("t_bbm", { mode: "id", id: a.entry.id })
    expect(one.ok && one.deleted).toBe(1)
    expect(listAgentMemory("t_bbm").some((e) => e.id === a.entry.id)).toBe(false)

    upsertAgentMemory({
      tenantId: "t_bbm",
      propertyId: "p_waterman",
      kind: "dock_quirk",
      title: "Dock quirk",
      body: "Bay B1 needs chock before reverse",
      createdBy: "u_nadia",
    })
    const byProp = purgeAgentMemory("t_bbm", { mode: "property", propertyId: "p_waterman" })
    expect(byProp.ok).toBe(true)
    if (byProp.ok) expect(byProp.deleted).toBeGreaterThanOrEqual(1)
    expect(listAgentMemory("t_bbm").every((e) => e.propertyId !== "p_waterman")).toBe(true)

    const all = purgeAgentMemory("t_bbm", { mode: "all" })
    expect(all.ok).toBe(true)
    expect(listAgentMemory("t_bbm")).toHaveLength(0)

    // Chat purge path writes audit
    const { runStubAskEasy } = await agentic()
    upsertAgentMemory({
      tenantId: "t_bbm",
      kind: "tone_pref",
      title: "Tone",
      body: "Keep replies short",
      createdBy: "u_nadia",
    })
    const purged = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Purge all memory notes",
    })
    expect(purged.kind).toBe("memory_purge")
    const audit = auditEventsForTenant("t_bbm")
    expect(audit.some((e) => e.kind === "memory_purge")).toBe(true)
  })

  it("wrong-tenant property id cannot write memory", async () => {
    const { upsertAgentMemory } = await agentic()
    const bad = upsertAgentMemory({
      tenantId: "t_deskulpt",
      propertyId: "p_waterman",
      kind: "issue",
      title: "Cross",
      body: "Should fail — Waterman is BBM",
      createdBy: "u_staff",
    })
    expect(bad.ok).toBe(false)
  })
})

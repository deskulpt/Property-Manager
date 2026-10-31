import { afterEach, describe, expect, it } from "vitest"
import { closeDatabase, createMarketDraft, resetSeedDatabase } from "@/lib/db"

describe("parked market ISO guardrails", () => {
  afterEach(() => {
    closeDatabase()
  })

  it("rejects CA draft without allowParked", () => {
    resetSeedDatabase()
    const result = createMarketDraft({ isoCode: "CA", name: "Canada" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/parked|CountryPack/i)
    }
  })

  it("allows CA draft when L0 sets allowParked", () => {
    resetSeedDatabase()
    const result = createMarketDraft({ isoCode: "CA", name: "Canada", allowParked: true })
    expect(result.ok).toBe(true)
  })

  it("still rejects India as draft", () => {
    resetSeedDatabase()
    const result = createMarketDraft({ isoCode: "IN", name: "India", allowParked: true })
    expect(result.ok).toBe(false)
  })
})

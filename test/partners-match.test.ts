import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  closeDatabase,
  eligibleProvidersForProperty,
  resetSeedDatabase,
} from "@/lib/db"

describe("eligibleProvidersForProperty seed", () => {
  beforeEach(() => {
    resetSeedDatabase()
  })
  afterEach(() => {
    closeDatabase()
  })

  it("includes Vikram for Pune Hinjewadi electrician jobs", () => {
    const list = eligibleProvidersForProperty("t_bbm", "p_pune", "electrician")
    expect(list.some((p) => p.id === "u_vikram_pune")).toBe(true)
  })

  it("excludes Vikram for Powai (outside 4110* catchment)", () => {
    const list = eligibleProvidersForProperty("t_bbm", "p_powai", "electrician")
    expect(list.some((p) => p.id === "u_vikram_pune")).toBe(false)
  })

  it("hides Chennai plumber with demand_ok=false", () => {
    const list = eligibleProvidersForProperty("t_harbour", "p_commissioners", "plumber")
    expect(list.some((p) => p.email === "lakshmi@chennaiplumb.example")).toBe(false)
  })
})

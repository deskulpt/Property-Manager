import { describe, expect, it } from "vitest"
import {
  autoPartitionLayout,
  emptyPlanDraft,
  parsePlanDraft,
  planDraftSchema,
  sanitizePlanLabel,
  snapPct,
} from "@/lib/plan-draft"

describe("plan-draft", () => {
  it("sanitizes labels and snaps percent coords", () => {
    expect(sanitizePlanLabel("<script>x</script>")).toBe("scriptx/script")
    expect(sanitizePlanLabel("Unit 1A")).toBe("Unit 1A")
    expect(snapPct(13.4)).toBe(14)
    expect(snapPct(-2)).toBe(0)
    expect(snapPct(101)).toBe(100)
  })

  it("auto-partitions with leftover corridor and validates", () => {
    const draft = autoPartitionLayout({
      totalArea: 10000,
      partitions: [
        { code: "1", sqft: 3000 },
        { code: "2", sqft: 2500 },
        { code: "3", sqft: 2000 },
      ],
      seed: 7,
      unit: "sqft",
    })
    expect(planDraftSchema.safeParse(draft).success).toBe(true)
    expect(draft.elements.some((e) => e.kind === "corridor")).toBe(true)
    expect(draft.elements.filter((e) => e.kind === "unit")).toHaveLength(3)
    expect(parsePlanDraft(JSON.stringify(draft))?.seed).toBe(7)
  })

  it("rejects malicious draft payloads", () => {
    const bad = {
      ...emptyPlanDraft(),
      elements: [
        {
          id: "x",
          kind: "unit",
          x: 0,
          y: 0,
          w: 10,
          h: 10,
          label: "<img src=x onerror=alert(1)>",
        },
      ],
    }
    expect(planDraftSchema.safeParse(bad).success).toBe(false)
  })
})

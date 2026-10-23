import { describe, expect, it } from "vitest"
import { daysBetween, interestPaise, roundHalfUp } from "@/lib/interest"

describe("simple daily interest (PRD §6.3)", () => {
  it("rounds half up in paise", () => {
    expect(roundHalfUp(1.4)).toBe(1)
    expect(roundHalfUp(1.5)).toBe(2)
    expect(roundHalfUp(2.5)).toBe(3)
  })

  it("computes principal × apr/365 × days", () => {
    // 100_00 paise · 18% · 26 days → 10000 * 18 * 26 / (100 * 365) = 128.219… → 128
    expect(interestPaise(10_000, 18, 26)).toBe(128)
    expect(interestPaise(10_000, 18, 0)).toBe(0)
    expect(interestPaise(10_000, 0, 26)).toBe(0)
  })

  it("counts calendar days between ISO dates", () => {
    expect(daysBetween("2026-09-06", "2026-10-03")).toBe(27)
    expect(daysBetween("2026-09-06", "2026-09-06")).toBe(0)
  })
})

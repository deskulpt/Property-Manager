import { describe, expect, it } from "vitest"
import { lateFeeCents, monthlyRentCents } from "@/lib/format"
import { convertFromInrMinor, gstCents } from "@/lib/market"
import { autoPartitionLayout, sanitizePlanLabel, snapPct } from "@/lib/plan-draft"
import { autoPartitionLayoutFallback } from "@/lib/rust/pack-fallback"
import { getRust, resetRustCache, rustAvailable, rustCoreBackend } from "@/lib/rust/load"
import {
  convertFromInrMinorDisplayCents,
  fxMicros,
  isValidSlug,
  isValidTenantId,
  normalizeSlug,
} from "@/lib/rust/money"

describe("easyrent-core WASM parity", () => {
  it("loads the nodejs WASM package", () => {
    resetRustCache()
    expect(rustAvailable()).toBe(true)
    expect(getRust()).not.toBeNull()
    expect(rustCoreBackend()).toBe("wasm")
    expect(getRust()?.rustCoreVersion?.()).toBeTruthy()
  })

  it("matches prior TS late-fee / GST / monthly-rent behavior", () => {
    expect(lateFeeCents(10_000_000, { flatCents: 2_500_000, percentBps: 150 })).toBe(2_500_000)
    expect(lateFeeCents(10_000_000, { flatCents: 100_000, percentBps: 150 })).toBe(150_000)
    expect(gstCents(1_000_000)).toBe(180_000)
    expect(monthlyRentCents(45.5, 1000)).toBe(4_550_000)
    expect(monthlyRentCents(45, 2140)).toBe(9_630_000)
  })

  it("FX conversion stays integer-safe via micros", () => {
    expect(fxMicros("USD")).toBe(12_000)
    expect(convertFromInrMinorDisplayCents(10_000, "USD")).toBe(120)
    const { major } = convertFromInrMinor(10_000, "USD")
    expect(major).toBeCloseTo(1.2, 10)
  })

  it("packing WASM matches TS fallback element geometry for fixed seed", () => {
    resetRustCache()
    expect(rustAvailable()).toBe(true)
    expect(getRust()).not.toBeNull()
    const input = {
      totalArea: 10000,
      partitions: [
        { code: "1", sqft: 3000 },
        { code: "2", sqft: 2500 },
        { code: "3", sqft: 2000 },
      ],
      seed: 7,
      unit: "sqft" as const,
    }
    const viaLive = autoPartitionLayout(input)
    const fallback = autoPartitionLayoutFallback(input)
    const strip = (d: { elements: unknown[]; updatedAt?: string }) => {
      const { updatedAt: _, ...rest } = d as { elements: unknown[]; updatedAt: string; seed?: number }
      return rest
    }
    // Live path must be WASM (not accidental fallback-equals-fallback).
    const rust = getRust()!
    const raw = JSON.parse(
      rust.auto_partition_layout(10000, JSON.stringify(input.partitions), 7, true, "sqft"),
    )
    expect(strip(viaLive)).toEqual(strip({ ...raw, updatedAt: viaLive.updatedAt }))
    expect(strip(viaLive)).toEqual(strip(fallback))
    expect(viaLive.elements.some((e) => e.kind === "corridor")).toBe(true)
    expect(viaLive.elements.filter((e) => e.kind === "unit")).toHaveLength(3)
  })

  it("sanitize / snap / slug helpers", () => {
    resetRustCache()
    expect(getRust()).not.toBeNull()
    expect(sanitizePlanLabel("<script>x</script>")).toBe("scriptx/script")
    expect(snapPct(13.4)).toBe(14)
    expect(normalizeSlug("BBM Logistics Parks")).toBe("bbm-logistics-parks")
    expect(normalizeSlug("  ---  ")).toBe("org")
    expect(isValidTenantId("t_bbm")).toBe(true)
    expect(isValidTenantId("bbm")).toBe(false)
    expect(isValidSlug("waterman")).toBe(true)
    expect(isValidSlug("-x")).toBe(false)
  })
})

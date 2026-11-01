import { describe, expect, it } from "vitest"
import {
  askEasyBubbleBadgeCount,
  buildAskEasyCtaChips,
} from "@/lib/ask-easy/cta-chips"
import {
  ASK_EASY_ISLAND_STORAGE_KEY,
  parseAskEasyIslandMode,
  readAskEasyIslandMode,
  writeAskEasyIslandMode,
  type IslandStorage,
} from "@/lib/ask-easy/island-prefs"

function memoryStorage(seed: Record<string, string> = {}): IslandStorage & {
  data: Record<string, string>
} {
  const data = { ...seed }
  return {
    data,
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key]! : null
    },
    setItem(key: string, value: string) {
      data[key] = String(value)
    },
    removeItem(key: string) {
      delete data[key]
    },
  }
}

describe("Ask Easy floating island prefs + CTAs", () => {
  it("parses open vs minimized (default minimized)", () => {
    expect(parseAskEasyIslandMode("open")).toBe("open")
    expect(parseAskEasyIslandMode("minimized")).toBe("minimized")
    expect(parseAskEasyIslandMode(null)).toBe("minimized")
    expect(parseAskEasyIslandMode("weird")).toBe("minimized")
  })

  it("persists open/minimized preference in storage", () => {
    const storage = memoryStorage()
    expect(readAskEasyIslandMode(storage)).toBe("minimized")
    writeAskEasyIslandMode(storage, "open")
    expect(storage.data[ASK_EASY_ISLAND_STORAGE_KEY]).toBe("open")
    expect(readAskEasyIslandMode(storage)).toBe("open")
    writeAskEasyIslandMode(storage, "minimized")
    expect(readAskEasyIslandMode(storage)).toBe("minimized")
  })

  it("builds deep-link CTA chips including approvals when pending", () => {
    const chips = buildAskEasyCtaChips({
      pendingCount: 2,
      draftCount: 1,
      propertyCount: 3,
    })
    const ids = chips.map((c) => c.id)
    expect(ids).toContain("approvals")
    expect(ids).toContain("drafts")
    expect(ids).toContain("listings")
    expect(ids).toContain("applications")
    expect(ids).toContain("units")
    expect(chips.find((c) => c.id === "approvals")?.label).toMatch(/Approvals \(2\)/)
    expect(chips.find((c) => c.id === "listings")?.href).toBe("/landlord/listings")
    expect(chips.find((c) => c.id === "applications")?.href).toBe("/landlord/applications")
    expect(chips.find((c) => c.id === "units")?.href).toBe("/landlord/properties")
  })

  it("gated mode only exposes package/pricing CTAs", () => {
    const chips = buildAskEasyCtaChips({
      gated: true,
      pendingCount: 9,
      draftCount: 9,
      propertyCount: 1,
    })
    expect(chips.map((c) => c.id)).toEqual(["settings-package", "pricing"])
  })

  it("bubble badge counts pending + updates", () => {
    expect(askEasyBubbleBadgeCount({ pendingCount: 0 })).toBe(0)
    expect(askEasyBubbleBadgeCount({ pendingCount: 3, updateCount: 2 })).toBe(5)
  })
})

import {
  emptyPlanDraft,
  type PlanDraft,
  type PlanElement,
} from "@/lib/plan-draft"
import type { ProposeOptions } from "@/lib/floor-ingest/types"

/** Mulberry32 — same family as pack-fallback for deterministic proposals. */
function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function id(prefix: string, n: number) {
  return `${prefix}_${n}`
}

/**
 * Stub “AI” proposal without Gemini: deterministic unit boxes + shell walls
 * sized for a leasing viewer (mall / office plate). Landlord edits in UnitPlanCreator.
 */
export function proposePlanDraft(opts: ProposeOptions): PlanDraft {
  const rand = mulberry32(opts.seed || 1)
  const draft = emptyPlanDraft(10_000, "sqft")
  draft.seed = opts.seed
  const elements: PlanElement[] = []

  // Exterior shell
  elements.push(
    { id: id("wall", 1), kind: "wall", x1: 4, y1: 6, x2: 96, y2: 6 },
    { id: id("wall", 2), kind: "wall", x1: 96, y1: 6, x2: 96, y2: 94 },
    { id: id("wall", 3), kind: "wall", x1: 96, y1: 94, x2: 4, y2: 94 },
    { id: id("wall", 4), kind: "wall", x1: 4, y1: 94, x2: 4, y2: 6 },
  )

  const isOffice = /office|12.?stor|tower/i.test(opts.filename)
  const isMall = /mall|retail|shop/i.test(opts.filename) || opts.kind === "pdf"
  const unitCount = isOffice ? 6 : isMall ? 8 : 4 + Math.floor(rand() * 3)

  const cols = isMall ? 4 : 3
  const rows = Math.ceil(unitCount / cols)
  const gap = 2
  const marginX = 8
  const marginY = 12
  const usableW = 100 - marginX * 2 - gap * (cols - 1)
  const usableH = 72 - gap * (rows - 1)
  const cellW = usableW / cols
  const cellH = usableH / rows

  let n = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (n >= unitCount) break
      const x = marginX + c * (cellW + gap)
      const y = marginY + r * (cellH + gap)
      const code = String.fromCharCode(65 + (n % 26)) + String(1 + Math.floor(n / 26))
      elements.push({
        id: id("unit", n + 1),
        kind: "unit",
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        w: Math.round((cellW - 0.5) * 10) / 10,
        h: Math.round((cellH - 0.5) * 10) / 10,
        label: `Unit ${code}`,
        unitCode: code,
        sqft: Math.round(800 + rand() * 1200),
      })
      // Door on south edge of each unit
      elements.push({
        id: id("door", n + 1),
        kind: "door",
        x: Math.round((x + cellW / 2 - 2) * 10) / 10,
        y: Math.round((y + cellH - 1.2) * 10) / 10,
        w: 4,
        rotation: 0,
      })
      // Demising wall between units
      if (c < cols - 1 && n + 1 < unitCount) {
        const wx = x + cellW + gap / 2
        elements.push({
          id: id("pwall", n + 1),
          kind: "wall",
          x1: Math.round(wx * 10) / 10,
          y1: Math.round(y * 10) / 10,
          x2: Math.round(wx * 10) / 10,
          y2: Math.round((y + cellH) * 10) / 10,
        })
      }
      n++
    }
  }

  // Corridor strip
  elements.push({
    id: id("corr", 1),
    kind: "corridor",
    x: 8,
    y: 86,
    w: 84,
    h: 6,
    label: "Corridor",
  })

  // Core: stairs + lift
  elements.push({
    id: id("lift", 1),
    kind: "lift",
    x: 84,
    y: 78,
    w: 8,
    h: 6,
    label: "Lift",
  })
  elements.push({
    id: id("room", 1),
    kind: "room",
    x: 74,
    y: 78,
    w: 8,
    h: 6,
    label: "Stairs",
  })

  draft.elements = elements
  draft.updatedAt = new Date().toISOString()
  return draft
}

/** Seed integer from sha256 hex — clamped to PlanDraft seed max (1_000_000). */
export function seedFromSha256(sha256: string): number {
  const slice = sha256.slice(0, 8)
  const n = Number.parseInt(slice, 16)
  if (!Number.isFinite(n)) return 1
  return (n >>> 0) % 1_000_001
}

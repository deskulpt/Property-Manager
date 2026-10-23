/**
 * TypeScript fallback for orthogonal packing — bit-identical to the prior
 * `lib/plan-draft.ts` implementation. Used when WASM is unavailable.
 * Parity is covered by `test/rust-core-parity.test.ts`.
 */

export type PlanAreaUnit = "sqft" | "sqyd"

export type PartitionInput = {
  code: string
  sqft: number
}

type PlanElement =
  | {
      id: string
      kind: "wall"
      x1: number
      y1: number
      x2: number
      y2: number
    }
  | {
      id: string
      kind: "door"
      x: number
      y: number
      w: number
      rotation: number
    }
  | {
      id: string
      kind: "room" | "bathroom" | "lift" | "unit" | "corridor"
      x: number
      y: number
      w: number
      h: number
      label: string
      unitCode?: string
      sqft?: number
    }

export type PlanDraftFallback = {
  version: 1
  unit: PlanAreaUnit
  totalArea: number
  seed?: number
  elements: PlanElement[]
  updatedAt: string
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function snapPctTs(value: number, grid = 2): number {
  return Math.min(100, Math.max(0, Math.round(value / grid) * grid))
}

function sanitizeTs(input: string): string {
  const cleaned = input.replace(/[^\w .'#/_-]/g, "").trim().slice(0, 40)
  return cleaned || "Untitled"
}

export function autoPartitionLayoutFallback(input: {
  totalArea: number
  partitions: PartitionInput[]
  seed?: number
  unit?: PlanAreaUnit
}): PlanDraftFallback {
  const totalArea = Math.max(1, Math.min(5_000_000, input.totalArea))
  const partitions = input.partitions
    .map((p) => ({
      code: sanitizeTs(p.code).replace(/\s+/g, "").slice(0, 12) || "U",
      sqft: Math.max(1, Math.min(totalArea, p.sqft)),
    }))
    .filter((p) => p.sqft > 0)
    .slice(0, 24)

  const sumUnits = partitions.reduce((acc, p) => acc + p.sqft, 0)
  const corridorArea = Math.max(0, totalArea - sumUnits)
  const rand = mulberry32(input.seed ?? 1)

  const margin = 4
  const usable = 100 - margin * 2
  const corridorStrip =
    corridorArea > 0 ? Math.max(6, Math.min(18, (corridorArea / totalArea) * usable)) : 0
  const packHeight = usable - corridorStrip
  let x = margin
  let y = margin
  let rowH = snapPctTs(12 + rand() * 10)
  const elements: PlanElement[] = []

  if (corridorStrip > 0) {
    elements.push({
      id: "el_corridor",
      kind: "corridor",
      x: margin,
      y: margin + packHeight,
      w: usable,
      h: snapPctTs(corridorStrip),
      label: "Corridor / common",
      sqft: Math.round(corridorArea),
    })
  }

  for (let i = 0; i < partitions.length; i++) {
    const part = partitions[i]
    const share = part.sqft / Math.max(sumUnits, 1)
    let w = snapPctTs(Math.max(10, share * usable * (0.85 + rand() * 0.3)))
    if (x + w > margin + usable) {
      x = margin
      y += rowH + 2
      rowH = snapPctTs(12 + rand() * 10)
      if (y + rowH > margin + packHeight) {
        rowH = Math.max(8, margin + packHeight - y)
      }
      w = Math.min(w, usable)
    }
    const h = Math.min(rowH, Math.max(8, margin + packHeight - y))
    if (h < 6) break
    elements.push({
      id: `el_unit_${i}_${part.code}`,
      kind: "unit",
      x: snapPctTs(x),
      y: snapPctTs(y),
      w: snapPctTs(Math.min(w, margin + usable - x)),
      h: snapPctTs(h),
      label: `Unit ${part.code}`,
      unitCode: part.code,
      sqft: part.sqft,
    })
    elements.push({
      id: `el_door_${i}`,
      kind: "door",
      x: snapPctTs(x + w / 2 - 2),
      y: snapPctTs(y + h - 1),
      w: 4,
      rotation: 0,
    })
    x += w + 2
  }

  const wallIds = ["n", "e", "s", "w"] as const
  const wallCoords: [number, number, number, number][] = [
    [margin, margin, margin + usable, margin],
    [margin + usable, margin, margin + usable, margin + usable],
    [margin, margin + usable, margin + usable, margin + usable],
    [margin, margin, margin, margin + usable],
  ]
  wallCoords.forEach((coords, i) => {
    elements.push({
      id: `el_wall_${wallIds[i]}`,
      kind: "wall",
      x1: coords[0],
      y1: coords[1],
      x2: coords[2],
      y2: coords[3],
    })
  })

  if (rand() > 0.35) {
    elements.push({
      id: "el_lift",
      kind: "lift",
      x: snapPctTs(margin + usable - 12),
      y: snapPctTs(margin + 2),
      w: 10,
      h: 10,
      label: "Lift",
    })
  }
  if (rand() > 0.45) {
    elements.push({
      id: "el_bath",
      kind: "bathroom",
      x: snapPctTs(margin + usable - 12),
      y: snapPctTs(margin + 14),
      w: 10,
      h: 8,
      label: "Bath",
    })
  }

  return {
    version: 1,
    unit: input.unit ?? "sqft",
    totalArea,
    seed: input.seed,
    elements,
    updatedAt: new Date().toISOString(),
  }
}

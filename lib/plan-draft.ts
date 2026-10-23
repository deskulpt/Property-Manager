import { z } from "zod"

/** Area unit for auto-partition form. */
export type PlanAreaUnit = "sqft" | "sqyd"

export const PLAN_DRAFT_VERSION = 1 as const

const labelSchema = z
  .string()
  .trim()
  .max(40)
  .regex(/^[A-Za-z0-9][A-Za-z0-9 .'#/_-]{0,39}$/, "Invalid label")

const elementBase = z.object({
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
})

export const planElementSchema = z.discriminatedUnion("kind", [
  elementBase.extend({
    kind: z.literal("wall"),
    x1: z.number().min(0).max(100),
    y1: z.number().min(0).max(100),
    x2: z.number().min(0).max(100),
    y2: z.number().min(0).max(100),
  }),
  elementBase.extend({
    kind: z.literal("door"),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    w: z.number().min(1).max(40),
    rotation: z.number().min(0).max(360),
  }),
  elementBase.extend({
    kind: z.enum(["room", "bathroom", "lift", "unit", "corridor"]),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    w: z.number().min(1).max(100),
    h: z.number().min(1).max(100),
    label: labelSchema,
    unitCode: z
      .string()
      .max(16)
      .regex(/^[A-Za-z0-9_-]*$/)
      .optional(),
    sqft: z.number().min(0).max(5_000_000).optional(),
  }),
])

export const planDraftSchema = z.object({
  version: z.literal(PLAN_DRAFT_VERSION),
  unit: z.enum(["sqft", "sqyd"]),
  totalArea: z.number().positive().max(5_000_000),
  seed: z.number().int().min(0).max(1_000_000).optional(),
  elements: z.array(planElementSchema).max(200),
  updatedAt: z.string().min(1).max(64),
})

export type PlanElement = z.infer<typeof planElementSchema>
export type PlanDraft = z.infer<typeof planDraftSchema>

export function emptyPlanDraft(totalArea = 10000, unit: PlanAreaUnit = "sqft"): PlanDraft {
  return {
    version: PLAN_DRAFT_VERSION,
    unit,
    totalArea,
    elements: [],
    updatedAt: new Date().toISOString(),
  }
}

export function parsePlanDraft(raw: string | null | undefined): PlanDraft | null {
  if (!raw) return null
  try {
    const parsed = planDraftSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function sanitizePlanLabel(input: string): string {
  const cleaned = input.replace(/[^\w .'#/_-]/g, "").trim().slice(0, 40)
  return cleaned || "Untitled"
}

/** Snap percent coords to a light grid (2%). */
export function snapPct(value: number, grid = 2): number {
  return Math.min(100, Math.max(0, Math.round(value / grid) * grid))
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

export type PartitionInput = {
  code: string
  sqft: number
}

/**
 * Orthogonal rectangle pack: units as proportional blocks, leftover = corridor.
 * Areas are in the draft's unit (sqft or sqyd) — caller converts before calling.
 */
export function autoPartitionLayout(input: {
  totalArea: number
  partitions: PartitionInput[]
  seed?: number
  unit?: PlanAreaUnit
}): PlanDraft {
  const totalArea = Math.max(1, Math.min(5_000_000, input.totalArea))
  const partitions = input.partitions
    .map((p) => ({
      code: sanitizePlanLabel(p.code).replace(/\s+/g, "").slice(0, 12) || "U",
      sqft: Math.max(1, Math.min(totalArea, p.sqft)),
    }))
    .filter((p) => p.sqft > 0)
    .slice(0, 24)

  const sumUnits = partitions.reduce((acc, p) => acc + p.sqft, 0)
  const corridorArea = Math.max(0, totalArea - sumUnits)
  const rand = mulberry32(input.seed ?? 1)

  // Pack along rows; row height varies slightly with seed.
  const margin = 4
  const usable = 100 - margin * 2
  const corridorStrip = corridorArea > 0 ? Math.max(6, Math.min(18, (corridorArea / totalArea) * usable)) : 0
  const packHeight = usable - corridorStrip
  let x = margin
  let y = margin
  let rowH = snapPct(12 + rand() * 10)
  const elements: PlanElement[] = []

  if (corridorStrip > 0) {
    elements.push({
      id: "el_corridor",
      kind: "corridor",
      x: margin,
      y: margin + packHeight,
      w: usable,
      h: snapPct(corridorStrip),
      label: "Corridor / common",
      sqft: Math.round(corridorArea),
    })
  }

  for (let i = 0; i < partitions.length; i++) {
    const part = partitions[i]
    const share = part.sqft / Math.max(sumUnits, 1)
    let w = snapPct(Math.max(10, share * usable * (0.85 + rand() * 0.3)))
    if (x + w > margin + usable) {
      x = margin
      y += rowH + 2
      rowH = snapPct(12 + rand() * 10)
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
      x: snapPct(x),
      y: snapPct(y),
      w: snapPct(Math.min(w, margin + usable - x)),
      h: snapPct(h),
      label: `Unit ${part.code}`,
      unitCode: part.code,
      sqft: part.sqft,
    })
    // Door on south edge of unit
    elements.push({
      id: `el_door_${i}`,
      kind: "door",
      x: snapPct(x + w / 2 - 2),
      y: snapPct(y + h - 1),
      w: 4,
      rotation: 0,
    })
    x += w + 2
  }

  // Outer walls
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

  // Amenity stubs in leftover corner if space
  if (rand() > 0.35) {
    elements.push({
      id: "el_lift",
      kind: "lift",
      x: snapPct(margin + usable - 12),
      y: snapPct(margin + 2),
      w: 10,
      h: 10,
      label: "Lift",
    })
  }
  if (rand() > 0.45) {
    elements.push({
      id: "el_bath",
      kind: "bathroom",
      x: snapPct(margin + usable - 12),
      y: snapPct(margin + 14),
      w: 10,
      h: 8,
      label: "Bath",
    })
  }

  return {
    version: PLAN_DRAFT_VERSION,
    unit: input.unit ?? "sqft",
    totalArea,
    seed: input.seed,
    elements,
    updatedAt: new Date().toISOString(),
  }
}

export function sqydToSqft(sqyd: number) {
  return sqyd * 9
}

export function sqftToSqyd(sqft: number) {
  return sqft / 9
}

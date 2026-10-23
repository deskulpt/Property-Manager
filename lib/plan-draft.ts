import { z } from "zod"
import { getRust } from "@/lib/rust/load"
import { autoPartitionLayoutFallback } from "@/lib/rust/pack-fallback"

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
  const rust = getRust()
  if (rust) return rust.sanitize_plan_label(input)
  const cleaned = input.replace(/[^\w .'#/_-]/g, "").trim().slice(0, 40)
  return cleaned || "Untitled"
}

/** Snap percent coords to a light grid (2%). */
export function snapPct(value: number, grid = 2): number {
  const rust = getRust()
  if (rust) return rust.snap_pct(value, grid)
  return Math.min(100, Math.max(0, Math.round(value / grid) * grid))
}

export type PartitionInput = {
  code: string
  sqft: number
}

/**
 * Orthogonal rectangle pack: units as proportional blocks, leftover = corridor.
 * Prefer `easyrent-core` WASM; fall back to TS with identical Mulberry32 seeding.
 */
export function autoPartitionLayout(input: {
  totalArea: number
  partitions: PartitionInput[]
  seed?: number
  unit?: PlanAreaUnit
}): PlanDraft {
  const rust = getRust()
  if (rust) {
    const raw = rust.auto_partition_layout(
      input.totalArea,
      JSON.stringify(input.partitions),
      input.seed ?? 0,
      input.seed != null,
      input.unit ?? "sqft",
    )
    const parsed = JSON.parse(raw) as PlanDraft
    parsed.updatedAt = new Date().toISOString()
    return parsed
  }
  return autoPartitionLayoutFallback(input) as PlanDraft
}

export function sqydToSqft(sqyd: number) {
  const rust = getRust()
  if (rust) return rust.sqyd_to_sqft(sqyd)
  return sqyd * 9
}

export function sqftToSqyd(sqft: number) {
  const rust = getRust()
  if (rust) return rust.sqft_to_sqyd(sqft)
  return sqft / 9
}

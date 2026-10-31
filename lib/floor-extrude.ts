import type { PlanDraft, PlanElement } from "@/lib/plan-draft"
import type { UnitStatus } from "@/lib/format"

/** Floor plate for R3F stacked extrusion (percent → metres). */
export type ExtrudeFloorLevel = {
  id: string
  label: string
  levelIndex: number
  draft: PlanDraft
}

export type ExtrudeUnitPick = {
  meshKey: string
  unitCode: string
  floorId: string
  status: UnitStatus
  href: string
  x: number
  y: number
  w: number
  h: number
  levelIndex: number
}

export type ExtrudeMesh =
  | {
      kind: "wall"
      id: string
      floorId: string
      levelIndex: number
      /** Centre in metres, Y-up. */
      position: [number, number, number]
      /** Length along local X, thickness Z, height Y. */
      size: [number, number, number]
      rotationY: number
    }
  | {
      kind: "slab" | "unit" | "lift" | "stairs" | "corridor"
      id: string
      floorId: string
      levelIndex: number
      position: [number, number, number]
      size: [number, number, number]
      unitCode?: string
      status?: UnitStatus
      href?: string
      label?: string
    }

const PLATE_METRES = 40
const FLOOR_HEIGHT = 3.2
const SLAB_THICK = 0.18
const WALL_THICK = 0.22
const WALL_HEIGHT = 2.7

function pctToM(pct: number) {
  return (pct / 100) * PLATE_METRES - PLATE_METRES / 2
}

function statusTint(status: UnitStatus | undefined): string {
  switch (status) {
    case "available":
      return "#1f6b4a"
    case "pending":
      return "#8f6f1f"
    case "leased":
      return "#5a6570"
    case "hold":
      return "#6b5b4a"
    default:
      return "#0e6e8c"
  }
}

export { statusTint, PLATE_METRES, FLOOR_HEIGHT }

function wallMesh(
  el: Extract<PlanElement, { kind: "wall" }>,
  floorId: string,
  levelIndex: number,
  baseY: number,
): ExtrudeMesh | null {
  const x1 = pctToM(el.x1)
  const z1 = pctToM(el.y1)
  const x2 = pctToM(el.x2)
  const z2 = pctToM(el.y2)
  const dx = x2 - x1
  const dz = z2 - z1
  const len = Math.hypot(dx, dz)
  if (len < 0.05) return null
  return {
    kind: "wall",
    id: `${floorId}:${el.id}`,
    floorId,
    levelIndex,
    position: [(x1 + x2) / 2, baseY + WALL_HEIGHT / 2, (z1 + z2) / 2],
    size: [len, WALL_HEIGHT, WALL_THICK],
    rotationY: Math.atan2(dz, dx),
  }
}

function boxMesh(
  el: Extract<PlanElement, { kind: "unit" | "lift" | "room" | "corridor" | "bathroom" }>,
  floorId: string,
  levelIndex: number,
  baseY: number,
  unitStatus?: Map<string, UnitStatus>,
  unitHref?: Map<string, string>,
): ExtrudeMesh {
  const x = pctToM(el.x)
  const z = pctToM(el.y)
  const w = (el.w / 100) * PLATE_METRES
  const d = (el.h / 100) * PLATE_METRES
  const kind =
    el.kind === "unit"
      ? "unit"
      : el.kind === "lift"
        ? "lift"
        : el.kind === "corridor"
          ? "corridor"
          : el.label?.toLowerCase().includes("stair")
            ? "stairs"
            : "unit"
  const code = el.kind === "unit" ? el.unitCode || el.label.replace(/^Unit\s+/i, "") : undefined
  return {
    kind: kind === "stairs" ? "stairs" : kind,
    id: `${floorId}:${el.id}`,
    floorId,
    levelIndex,
    position: [x + w / 2, baseY + 0.05, z + d / 2],
    size: [Math.max(0.4, w), kind === "unit" ? 0.12 : 0.35, Math.max(0.4, d)],
    unitCode: code,
    status: code ? unitStatus?.get(code) : undefined,
    href: code ? unitHref?.get(code) : undefined,
    label: el.label,
  }
}

/**
 * Build extrude meshes for a stack of floor drafts (leasing structure only).
 * Doors become wall gaps conceptually (omitted as solids); walls/units/lifts/stairs kept.
 */
export function buildExtrudeMeshes(
  floors: ExtrudeFloorLevel[],
  opts?: {
    unitStatusByCode?: Map<string, UnitStatus>
    unitHrefByCode?: Map<string, string>
  },
): ExtrudeMesh[] {
  const ordered = [...floors].sort((a, b) => a.levelIndex - b.levelIndex)
  const meshes: ExtrudeMesh[] = []

  for (const floor of ordered) {
    const baseY = floor.levelIndex * FLOOR_HEIGHT
    meshes.push({
      kind: "slab",
      id: `${floor.id}:slab`,
      floorId: floor.id,
      levelIndex: floor.levelIndex,
      position: [0, baseY, 0],
      size: [PLATE_METRES, SLAB_THICK, PLATE_METRES],
      label: floor.label,
    })

    for (const el of floor.draft.elements) {
      if (el.kind === "wall") {
        const mesh = wallMesh(el, floor.id, floor.levelIndex, baseY + SLAB_THICK)
        if (mesh) meshes.push(mesh)
      } else if (
        el.kind === "unit" ||
        el.kind === "lift" ||
        el.kind === "room" ||
        el.kind === "corridor" ||
        el.kind === "bathroom"
      ) {
        meshes.push(
          boxMesh(el, floor.id, floor.levelIndex, baseY + SLAB_THICK, opts?.unitStatusByCode, opts?.unitHrefByCode),
        )
      }
      // doors intentionally omitted as solids (openings)
    }
  }

  return meshes
}

export function floorsWithDrafts(
  floors: {
    id: string
    label: string
    levelIndex: number
    planDraftJson?: string | null
  }[],
  parse: (raw: string | null | undefined) => PlanDraft | null,
): ExtrudeFloorLevel[] {
  return floors
    .map((f) => {
      const draft = parse(f.planDraftJson)
      if (!draft || draft.elements.length === 0) return null
      return {
        id: f.id,
        label: f.label,
        levelIndex: f.levelIndex,
        draft,
      }
    })
    .filter(Boolean) as ExtrudeFloorLevel[]
}

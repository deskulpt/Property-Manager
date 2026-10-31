import { createHash } from "node:crypto"
import { proposePlanDraft, seedFromSha256 } from "@/lib/floor-ingest/propose"
import { shouldKeepEntity, defaultKeepDropSummary } from "@/lib/floor-ingest/simplify"
import {
  emptyFloorMapDocument,
  type FloorIngestResult,
} from "@/lib/floor-ingest/types"
import type { PlanElement } from "@/lib/plan-draft"
import { emptyPlanDraft } from "@/lib/plan-draft"
import { pdfPageToSvgPlate } from "@/lib/floor-ingest/pdf"

type DxfPair = { code: number; value: string }

/** Parse DXF into code/value pairs (ASCII DXF). */
export function parseDxfPairs(text: string): DxfPair[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  const pairs: DxfPair[] = []
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim())
    if (!Number.isFinite(code)) continue
    pairs.push({ code, value: lines[i + 1] ?? "" })
  }
  return pairs
}

type RawEntity = {
  type: string
  layer: string
  points: { x: number; y: number }[]
  closed?: boolean
}

/** Collect LINE / LWPOLYLINE / CIRCLE / INSERT entities with layers. */
export function extractDxfEntities(pairs: DxfPair[]): RawEntity[] {
  const entities: RawEntity[] = []
  let inEntities = false
  let current: RawEntity | null = null
  let pendingX: number | null = null

  const flush = () => {
    if (current) entities.push(current)
    current = null
    pendingX = null
  }

  for (const pair of pairs) {
    if (pair.code === 0 && pair.value.trim() === "SECTION") {
      // next 2 may be name
      continue
    }
    if (pair.code === 2 && pair.value.trim().toUpperCase() === "ENTITIES") {
      inEntities = true
      continue
    }
    if (pair.code === 0 && pair.value.trim() === "ENDSEC" && inEntities) {
      flush()
      inEntities = false
      continue
    }
    if (!inEntities) continue

    if (pair.code === 0) {
      flush()
      const type = pair.value.trim().toUpperCase()
      if (type === "LINE" || type === "LWPOLYLINE" || type === "POLYLINE" || type === "CIRCLE" || type === "INSERT") {
        current = { type, layer: "0", points: [] }
      } else {
        current = null
      }
      continue
    }
    if (!current) continue
    if (pair.code === 8) current.layer = pair.value.trim()
    if (pair.code === 70 && current.type === "LWPOLYLINE") {
      current.closed = (Number(pair.value) & 1) === 1
    }
    if (pair.code === 10) {
      pendingX = Number(pair.value)
    }
    if (pair.code === 20 && pendingX != null) {
      const y = Number(pair.value)
      if (Number.isFinite(pendingX) && Number.isFinite(y)) {
        current.points.push({ x: pendingX, y })
      }
      pendingX = null
    }
    if (pair.code === 11 && current.type === "LINE") {
      pendingX = Number(pair.value)
    }
    if (pair.code === 21 && current.type === "LINE" && pendingX != null) {
      const y = Number(pair.value)
      if (Number.isFinite(pendingX) && Number.isFinite(y)) {
        current.points.push({ x: pendingX, y })
      }
      pendingX = null
    }
  }
  flush()
  return entities
}

function boundsOf(entities: RawEntity[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const e of entities) {
    for (const p of e.points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  }
  if (maxX - minX < 1e-6) maxX = minX + 1
  if (maxY - minY < 1e-6) maxY = minY + 1
  return { minX, minY, maxX, maxY }
}

function toPct(value: number, min: number, max: number) {
  return Math.min(100, Math.max(0, Math.round((((value - min) / (max - min)) * 100) * 10) / 10))
}

/** Convert kept DXF entities into PlanDraft percent-space elements. */
export function dxfEntitiesToDraft(entities: RawEntity[], seed: number) {
  const kept = entities.filter((e) => shouldKeepEntity(e.layer, e.type))
  const dropped = entities.length - kept.length
  const box = boundsOf(kept.length ? kept : entities)
  const draft = emptyPlanDraft(10_000, "sqft")
  draft.seed = seed
  const elements: PlanElement[] = []
  let wallN = 0
  let unitN = 0
  let doorN = 0
  let liftN = 0
  let roomN = 0

  for (const e of kept) {
    const layer = e.layer.toLowerCase()
    if (e.type === "LINE" && e.points.length >= 2) {
      const a = e.points[0]
      const b = e.points[1]
      wallN++
      elements.push({
        id: `wall_${wallN}`,
        kind: "wall",
        x1: toPct(a.x, box.minX, box.maxX),
        y1: toPct(a.y, box.minY, box.maxY),
        x2: toPct(b.x, box.minX, box.maxX),
        y2: toPct(b.y, box.minY, box.maxY),
      })
      continue
    }
    if ((e.type === "LWPOLYLINE" || e.type === "POLYLINE") && e.points.length >= 2) {
      const xs = e.points.map((p) => p.x)
      const ys = e.points.map((p) => p.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const x = toPct(minX, box.minX, box.maxX)
      const y = toPct(minY, box.minY, box.maxY)
      const w = Math.max(1, toPct(maxX, box.minX, box.maxX) - x)
      const h = Math.max(1, toPct(maxY, box.minY, box.maxY) - y)
      if (/lift|elev/.test(layer)) {
        liftN++
        elements.push({
          id: `lift_${liftN}`,
          kind: "lift",
          x,
          y,
          w,
          h,
          label: "Lift",
        })
      } else if (/stair/.test(layer)) {
        roomN++
        elements.push({
          id: `room_${roomN}`,
          kind: "room",
          x,
          y,
          w,
          h,
          label: "Stairs",
        })
      } else if (/unit|suite|tenant|bay|shop|space/.test(layer) || e.closed) {
        unitN++
        const code = String.fromCharCode(64 + ((unitN - 1) % 26) + 1) + String(unitN)
        elements.push({
          id: `unit_${unitN}`,
          kind: "unit",
          x,
          y,
          w,
          h,
          label: `Unit ${code}`,
          unitCode: code,
        })
      } else {
        // Partition / outline as wall segments
        for (let i = 0; i < e.points.length - 1; i++) {
          wallN++
          const a = e.points[i]
          const b = e.points[i + 1]
          elements.push({
            id: `wall_${wallN}`,
            kind: "wall",
            x1: toPct(a.x, box.minX, box.maxX),
            y1: toPct(a.y, box.minY, box.maxY),
            x2: toPct(b.x, box.minX, box.maxX),
            y2: toPct(b.y, box.minY, box.maxY),
          })
        }
        if (e.closed && e.points.length >= 2) {
          wallN++
          const a = e.points[e.points.length - 1]
          const b = e.points[0]
          elements.push({
            id: `wall_${wallN}`,
            kind: "wall",
            x1: toPct(a.x, box.minX, box.maxX),
            y1: toPct(a.y, box.minY, box.maxY),
            x2: toPct(b.x, box.minX, box.maxX),
            y2: toPct(b.y, box.minY, box.maxY),
          })
        }
      }
      continue
    }
    if (e.type === "INSERT" || e.type === "CIRCLE") {
      const p = e.points[0]
      if (!p) continue
      if (/door|open/.test(layer)) {
        doorN++
        elements.push({
          id: `door_${doorN}`,
          kind: "door",
          x: toPct(p.x, box.minX, box.maxX),
          y: toPct(p.y, box.minY, box.maxY),
          w: 4,
          rotation: 0,
        })
      } else if (/stair/.test(layer)) {
        roomN++
        elements.push({
          id: `room_${roomN}`,
          kind: "room",
          x: Math.max(0, toPct(p.x, box.minX, box.maxX) - 3),
          y: Math.max(0, toPct(p.y, box.minY, box.maxY) - 3),
          w: 6,
          h: 6,
          label: "Stairs",
        })
      }
    }
  }

  draft.elements = elements.slice(0, 200)
  draft.updatedAt = new Date().toISOString()
  return { draft, dropped, kept: kept.length }
}

export function ingestDxf(bytes: Buffer, filename: string): FloorIngestResult {
  const text = bytes.toString("utf8")
  if (!/SECTION/i.test(text) || !/ENTITIES/i.test(text)) {
    return {
      ok: false,
      kind: "dxf",
      error: "File does not look like an ASCII DXF drawing.",
      hint: "Export DXF (ASCII) or PDF from CAD, then upload again.",
    }
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex")
  const seed = seedFromSha256(sha256)
  const pairs = parseDxfPairs(text)
  const entities = extractDxfEntities(pairs)
  const keptPreview = entities.filter((e) => shouldKeepEntity(e.layer, e.type))
  let draft
  let dropped = 0
  let kept = 0
  if (keptPreview.length === 0) {
    // Fall back to stub proposal so landlord can still edit.
    draft = proposePlanDraft({ filename, kind: "dxf", seed })
    dropped = entities.length
    kept = 0
  } else {
    const converted = dxfEntitiesToDraft(entities, seed)
    draft = converted.draft
    dropped = converted.dropped
    kept = converted.kept
    if (draft.elements.filter((e) => e.kind === "unit").length === 0) {
      // Ensure at least manual unit boxes exist for editor.
      const stub = proposePlanDraft({ filename, kind: "dxf", seed })
      draft.elements = [...draft.elements, ...stub.elements.filter((e) => e.kind === "unit" || e.kind === "door")].slice(0, 200)
    }
  }

  const plate = pdfPageToSvgPlate(
    { width: 1000, height: 800, pageCount: 1 },
    filename,
    draft.elements,
  )
  const { keep, drop } = defaultKeepDropSummary()
  const document = emptyFloorMapDocument(draft, {
    source: {
      kind: "dxf",
      filename,
      contentType: "application/dxf",
      sha256,
      bytes: bytes.byteLength,
    },
    platePath: null,
    sourcePath: null,
    createdAt: new Date().toISOString(),
    keep,
    drop,
    notes: [
      `DXF simplified: kept ${kept} structural entities, dropped ${dropped} furniture/dims/title noise.`,
      "Edit walls and unit boxes in the plan creator, then publish the map version.",
    ],
    warnings: kept === 0 ? ["No whitelisted layers found — stub unit grid proposed for manual edit."] : [],
  })
  return {
    ok: true,
    kind: "dxf",
    document,
    plate: { ext: "svg", bytes: plate, contentType: "image/svg+xml" },
    sourceBytes: bytes,
    sourceExt: "dxf",
    sourceContentType: "application/dxf",
  }
}

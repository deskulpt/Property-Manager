import type { DropClass, KeepClass } from "@/lib/floor-ingest/types"
import { DROP_CLASSES, KEEP_CLASSES } from "@/lib/floor-ingest/types"

/** Layer / entity name → keep or drop for leasing viewer. */
const KEEP_LAYER_HINTS: { re: RegExp; cls: KeepClass }[] = [
  { re: /\b(ext|exterior|shell|perimeter)s?\b/i, cls: "exterior_walls" },
  { re: /\b(walls?|a-walls?|demising|partitions?|a-door.?walls?)\b/i, cls: "partition_walls" },
  { re: /\b(units?|suites?|tenants?|leases?|bays?|shops?|spaces?|rooms?)\b/i, cls: "unit_outlines" },
  { re: /\b(doors?|a-doors?|openings?|entr(?:y|ies))\b/i, cls: "doors" },
  { re: /\b(stairs?|a-flor.?strn|staircase)\b/i, cls: "stairs" },
  { re: /\b(lifts?|elevs?|elevators?|a-eqpm.?elev)\b/i, cls: "lifts" },
  { re: /\b(corridors?|halls?|lobbys?|lobbies|commons?)\b/i, cls: "corridors" },
  { re: /\b(opens?|voids?|shafts?)\b/i, cls: "openings" },
]

const DROP_LAYER_HINTS: { re: RegExp; cls: DropClass }[] = [
  { re: /\b(furn|furniture|desks?|chairs?|plants?|fixtures?)\b/i, cls: "furniture" },
  { re: /\b(dims?|dimensions?|anno.?dims?)\b/i, cls: "dimensions" },
  { re: /\b(titles?|borders?|sheets?|revisions?|legends?|north)\b/i, cls: "titleblocks" },
  { re: /\b(texts?|mtexts?|annos?|notes?|label.?texts?)\b/i, cls: "text_annotation" },
  { re: /\b(hatch(?:es|ing)?|solid.?fills?)\b/i, cls: "hatch_fills" },
  { re: /\b(hvac|elec|plumb|fire|mep|sprinkler)\b/i, cls: "mep_layers" },
  { re: /\b(defpoints?|guides?|xrefs?|viewports?)\b/i, cls: "defpoints" },
]

export type LayerDecision = { action: "keep"; cls: KeepClass } | { action: "drop"; cls: DropClass } | { action: "unknown" }

export function classifyLayerName(name: string): LayerDecision {
  const trimmed = name.trim()
  if (!trimmed) return { action: "unknown" }
  for (const hint of DROP_LAYER_HINTS) {
    if (hint.re.test(trimmed)) return { action: "drop", cls: hint.cls }
  }
  for (const hint of KEEP_LAYER_HINTS) {
    if (hint.re.test(trimmed)) return { action: "keep", cls: hint.cls }
  }
  return { action: "unknown" }
}

/** Whether an entity should survive simplify for the Easy Rental viewer. */
export function shouldKeepEntity(layerName: string, entityType?: string): boolean {
  const decision = classifyLayerName(layerName)
  if (decision.action === "drop") return false
  if (decision.action === "keep") return true
  // Unknown layers: keep structural entity types only.
  const type = (entityType ?? "").toUpperCase()
  if (type === "LINE" || type === "LWPOLYLINE" || type === "POLYLINE" || type === "ARC") return true
  if (type === "INSERT" || type === "CIRCLE") {
    // Doors / stairs / lifts often arrive as blocks or circles — keep if name hints.
    return /\b(door|stair|lift|elev|unit|wall)\b/i.test(layerName)
  }
  if (type === "TEXT" || type === "MTEXT" || type === "DIMENSION" || type === "HATCH") return false
  return false
}

export function defaultKeepDropSummary(): { keep: KeepClass[]; drop: DropClass[] } {
  return { keep: [...KEEP_CLASSES], drop: [...DROP_CLASSES] }
}

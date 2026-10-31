import { z } from "zod"
import { planDraftSchema, type PlanDraft } from "@/lib/plan-draft"

/** Source formats accepted for landlord/PM floor ingest. */
export type FloorIngestKind = "pdf" | "dxf" | "dwg" | "image"

export const FLOOR_MAP_VERSION = 1 as const

/** Geometry classes we keep for leasing 3D / floor viewer. */
export const KEEP_CLASSES = [
  "exterior_walls",
  "partition_walls",
  "unit_outlines",
  "doors",
  "stairs",
  "lifts",
  "openings",
  "corridors",
] as const

/** CAD noise dropped before viewer publish. */
export const DROP_CLASSES = [
  "furniture",
  "dimensions",
  "titleblocks",
  "text_annotation",
  "hatch_fills",
  "mep_layers",
  "defpoints",
] as const

export type KeepClass = (typeof KEEP_CLASSES)[number]
export type DropClass = (typeof DROP_CLASSES)[number]

export const floorMapDocumentSchema = z.object({
  version: z.literal(FLOOR_MAP_VERSION),
  source: z.object({
    kind: z.enum(["pdf", "dxf", "dwg", "image"]),
    filename: z.string().min(1).max(200),
    contentType: z.string().min(1).max(120),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    bytes: z.number().int().positive().max(50_000_000),
  }),
  platePath: z.string().min(1).max(500).nullable(),
  sourcePath: z.string().min(1).max(500).nullable(),
  keep: z.array(z.enum(KEEP_CLASSES)),
  drop: z.array(z.enum(DROP_CLASSES)),
  draft: planDraftSchema,
  notes: z.array(z.string().max(240)).max(40),
  warnings: z.array(z.string().max(240)).max(40),
  createdAt: z.string().min(1).max(64),
})

export type FloorMapDocument = z.infer<typeof floorMapDocumentSchema>

export type FloorIngestResult =
  | {
      ok: true
      kind: FloorIngestKind
      document: FloorMapDocument
      /** Raster/SVG plate bytes ready for ObjectStore (when produced). */
      plate?: { ext: "svg" | "png" | "jpg" | "webp" | "gif"; bytes: Buffer; contentType: string }
      /** Original bytes to retain under floorplans namespace. */
      sourceBytes: Buffer
      sourceExt: string
      sourceContentType: string
    }
  | {
      ok: false
      kind?: FloorIngestKind
      error: string
      /** Soft guidance (e.g. DWG → export DXF/PDF). */
      hint?: string
    }

export type ProposeOptions = {
  filename: string
  kind: FloorIngestKind
  /** Deterministic seed from file hash. */
  seed: number
  pageWidth?: number
  pageHeight?: number
}

export function emptyFloorMapDocument(
  draft: PlanDraft,
  partial: Omit<FloorMapDocument, "version" | "draft" | "keep" | "drop" | "notes" | "warnings"> & {
    keep?: KeepClass[]
    drop?: DropClass[]
    notes?: string[]
    warnings?: string[]
  },
): FloorMapDocument {
  return {
    version: FLOOR_MAP_VERSION,
    keep: partial.keep ?? [...KEEP_CLASSES],
    drop: partial.drop ?? [...DROP_CLASSES],
    notes: partial.notes ?? [],
    warnings: partial.warnings ?? [],
    draft,
    source: partial.source,
    platePath: partial.platePath,
    sourcePath: partial.sourcePath,
    createdAt: partial.createdAt,
  }
}

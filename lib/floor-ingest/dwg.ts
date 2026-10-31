import type { FloorIngestResult } from "@/lib/floor-ingest/types"

/**
 * Native DWG (AC1032+) needs an ODA/LibreDWG converter we do not ship in MVP.
 * Ask landlords/PMs to export DXF or PDF — same keep/drop rules apply after convert.
 */
export function ingestDwg(_bytes: Buffer, filename: string): FloorIngestResult {
  return {
    ok: false,
    kind: "dwg",
    error: `Native DWG is not ingested in this build (${filename}).`,
    hint: "Export DXF (ASCII) or a single-page PDF from AutoCAD / BricsCAD / LibreCAD, then drag that file here. We keep exterior/partition walls, unit outlines, doors, stairs, lifts, and openings — not furniture, dims, or titleblocks.",
  }
}

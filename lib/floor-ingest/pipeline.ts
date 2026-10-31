import { createHash } from "node:crypto"
import { extensionOf, maxBytesForKind, sniffFloorIngest } from "@/lib/floor-ingest/sniff"
import { ingestPdf } from "@/lib/floor-ingest/pdf"
import { ingestDxf } from "@/lib/floor-ingest/dxf"
import { ingestDwg } from "@/lib/floor-ingest/dwg"
import { proposePlanDraft, seedFromSha256 } from "@/lib/floor-ingest/propose"
import { defaultKeepDropSummary } from "@/lib/floor-ingest/simplify"
import {
  emptyFloorMapDocument,
  type FloorIngestResult,
} from "@/lib/floor-ingest/types"

const IMAGE_CONTENT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
}

function ingestImage(bytes: Buffer, filename: string, contentType?: string | null): FloorIngestResult {
  const ext = extensionOf(filename) || "png"
  const normalizedExt = ext === "jpeg" ? "jpg" : ext
  const ct = contentType && contentType.startsWith("image/") ? contentType : IMAGE_CONTENT[normalizedExt] ?? "application/octet-stream"
  const sha256 = createHash("sha256").update(bytes).digest("hex")
  const seed = seedFromSha256(sha256)
  const draft = proposePlanDraft({ filename, kind: "image", seed })
  const { keep, drop } = defaultKeepDropSummary()
  const document = emptyFloorMapDocument(draft, {
    source: {
      kind: "image",
      filename,
      contentType: ct,
      sha256,
      bytes: bytes.byteLength,
    },
    platePath: null,
    sourcePath: null,
    createdAt: new Date().toISOString(),
    keep,
    drop,
    notes: [
      "Image plate kept as-is; stub unit boxes proposed for manual edit.",
      "Furniture/text already baked into raster cannot be stripped — redraw walls/units as needed.",
    ],
  })
  return {
    ok: true,
    kind: "image",
    document,
    plate: {
      ext:
        normalizedExt === "svg"
          ? "svg"
          : normalizedExt === "jpg"
            ? "jpg"
            : normalizedExt === "webp"
              ? "webp"
              : normalizedExt === "gif"
                ? "gif"
                : "png",
      bytes,
      contentType: ct,
    },
    sourceBytes: bytes,
    sourceExt: normalizedExt === "jpeg" ? "jpg" : normalizedExt,
    sourceContentType: ct,
  }
}

/**
 * CAD/PDF/image → simplified FloorMapDocument + optional plate bytes.
 * DWG returns a clear export-DXF/PDF message (no native converter in MVP).
 */
export function runFloorIngest(input: {
  bytes: Buffer
  filename: string
  contentType?: string | null
}): FloorIngestResult {
  const filename = (input.filename || "upload.bin").slice(0, 200)
  if (!input.bytes?.byteLength) {
    return { ok: false, error: "Choose a PDF, DXF, or floor-plan image to upload." }
  }
  const kind = sniffFloorIngest(input.bytes, filename, input.contentType)
  if (!kind) {
    return {
      ok: false,
      error: "Unsupported file type.",
      hint: "Upload PDF or DXF (preferred). DWG must be exported to DXF/PDF first. Images (PNG/JPEG/WebP/GIF/SVG) also work.",
    }
  }
  const max = maxBytesForKind(kind)
  if (input.bytes.byteLength > max) {
    return { ok: false, kind, error: `File exceeds the ${Math.round(max / 1_000_000)} MB limit for ${kind.toUpperCase()}.` }
  }
  if (kind === "pdf") return ingestPdf(input.bytes, filename)
  if (kind === "dxf") return ingestDxf(input.bytes, filename)
  if (kind === "dwg") return ingestDwg(input.bytes, filename)
  return ingestImage(input.bytes, filename, input.contentType)
}

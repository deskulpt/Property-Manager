import { createHash } from "node:crypto"
import { proposePlanDraft, seedFromSha256 } from "@/lib/floor-ingest/propose"
import {
  extractPdfVectors,
  pdfVectorsToDraft,
} from "@/lib/floor-ingest/pdf-vectors"
import { defaultKeepDropSummary } from "@/lib/floor-ingest/simplify"
import {
  emptyFloorMapDocument,
  type FloorIngestResult,
} from "@/lib/floor-ingest/types"

export type PdfPageInfo = {
  width: number
  height: number
  pageCount: number
}

/** Lightweight PDF page metrics (no Gemini / no poppler). */
export function readPdfPageInfo(bytes: Buffer): PdfPageInfo {
  const text = bytes.toString("latin1")
  const boxes = [...text.matchAll(/\/MediaBox\s*\[\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\]/g)]
  let width = 850
  let height = 1100
  if (boxes.length > 0) {
    const m = boxes[0]
    const x0 = Number(m[1])
    const y0 = Number(m[2])
    const x1 = Number(m[3])
    const y1 = Number(m[4])
    width = Math.max(1, x1 - x0)
    height = Math.max(1, y1 - y0)
  }
  const pageCount = Math.max(1, (text.match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? []).length)
  return { width, height, pageCount }
}

/** Deterministic SVG plate standing in for PDF raster when poppler/sharp-pdf unavailable. */
export function pdfPageToSvgPlate(
  info: PdfPageInfo,
  label: string,
  draftElements: { kind: string; x?: number; y?: number; w?: number; h?: number; x1?: number; y1?: number; x2?: number; y2?: number; label?: string }[],
): Buffer {
  const w = 1000
  const h = Math.round((info.height / info.width) * w) || 1400
  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(label)}">`,
  )
  parts.push(`<rect width="100%" height="100%" fill="#0a1624"/>`)
  parts.push(
    `<rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="none" stroke="#0e6e8c" stroke-width="2"/>`,
  )
  parts.push(
    `<text x="40" y="56" fill="#8f6f1f" font-family="ui-monospace,monospace" font-size="18">${escapeXml(label)}</text>`,
  )
  parts.push(
    `<text x="40" y="78" fill="#9bb4c7" font-family="ui-monospace,monospace" font-size="12">PDF page → leasing plate · ${info.pageCount} page(s) · ${Math.round(info.width)}×${Math.round(info.height)}</text>`,
  )

  for (const el of draftElements) {
    if (el.kind === "wall" && el.x1 != null && el.y1 != null && el.x2 != null && el.y2 != null) {
      parts.push(
        `<line x1="${pct(el.x1, w)}" y1="${pct(el.y1, h)}" x2="${pct(el.x2, w)}" y2="${pct(el.y2, h)}" stroke="#cfe7f2" stroke-width="3"/>`,
      )
    } else if (
      (el.kind === "unit" || el.kind === "corridor" || el.kind === "lift" || el.kind === "room") &&
      el.x != null &&
      el.y != null &&
      el.w != null &&
      el.h != null
    ) {
      const fill =
        el.kind === "unit" ? "rgba(14,110,140,0.35)" : el.kind === "lift" ? "rgba(143,111,31,0.4)" : "rgba(31,107,74,0.28)"
      parts.push(
        `<rect x="${pct(el.x, w)}" y="${pct(el.y, h)}" width="${pct(el.w, w)}" height="${pct(el.h, h)}" fill="${fill}" stroke="#7ec8dd" stroke-width="1.5"/>`,
      )
      if (el.label) {
        parts.push(
          `<text x="${pct(el.x + 1, w)}" y="${pct(el.y + 4, h)}" fill="#e8f4f8" font-family="ui-sans-serif,system-ui,sans-serif" font-size="14">${escapeXml(el.label)}</text>`,
        )
      }
    } else if (el.kind === "door" && el.x != null && el.y != null && el.w != null) {
      parts.push(
        `<rect x="${pct(el.x, w)}" y="${pct(el.y, h)}" width="${pct(el.w, w)}" height="${pct(1.5, h)}" fill="#8f6f1f"/>`,
      )
    }
  }

  parts.push(`</svg>`)
  return Buffer.from(parts.join(""), "utf8")
}

function pct(value: number, total: number) {
  return Math.round((value / 100) * total * 10) / 10
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")
}

export function ingestPdf(bytes: Buffer, filename: string): FloorIngestResult {
  const info = readPdfPageInfo(bytes)
  const sha256 = createHash("sha256").update(bytes).digest("hex")
  const seed = seedFromSha256(sha256)
  const vectors = extractPdfVectors(bytes, info.width, info.height)
  const fromVectors = pdfVectorsToDraft(vectors, seed)
  const notes: string[] = []
  const warnings: string[] = []

  let draft
  if (fromVectors && (fromVectors.wallCount >= 2 || fromVectors.unitCount >= 1)) {
    draft = fromVectors.draft
    // Ensure lift/stairs affordances exist for multi-floor align even if PDF lacked labelled cores.
    if (!draft.elements.some((e) => e.kind === "lift")) {
      const stub = proposePlanDraft({
        filename,
        kind: "pdf",
        seed,
        pageWidth: info.width,
        pageHeight: info.height,
      })
      draft.elements = [
        ...draft.elements,
        ...stub.elements.filter((e) => e.kind === "lift" || (e.kind === "room" && /stair/i.test(e.label))),
      ].slice(0, 200)
    }
    notes.push(
      `PDF vectors extracted: ${fromVectors.wallCount} wall segments, ${fromVectors.unitCount} unit rects from ${vectors.streamCount} content stream(s).`,
    )
    notes.push("Keep set: walls, units, doors, stairs, lifts — furniture/dims/titleblocks not proposed.")
  } else {
    draft = proposePlanDraft({
      filename,
      kind: "pdf",
      seed,
      pageWidth: info.width,
      pageHeight: info.height,
    })
    notes.push(
      "PDF had sparse vectors — deterministic leasing plate proposed (no Gemini). Edit walls/units before publish.",
    )
    if (vectors.streamCount === 0) {
      warnings.push("No FlateDecode/content streams parsed; plate uses seeded stub geometry.")
    } else {
      warnings.push(
        `Parsed ${vectors.segments.length} segments / ${vectors.rects.length} rects but below leasing threshold — stub grid applied.`,
      )
    }
  }

  const plate = pdfPageToSvgPlate(info, filename, draft.elements)
  const { keep, drop } = defaultKeepDropSummary()
  if (info.pageCount > 1) {
    warnings.push(`PDF has ${info.pageCount} pages; first page MediaBox used for the plate.`)
  }
  const document = emptyFloorMapDocument(draft, {
    source: {
      kind: "pdf",
      filename,
      contentType: "application/pdf",
      sha256,
      bytes: bytes.byteLength,
    },
    platePath: null,
    sourcePath: null,
    createdAt: new Date().toISOString(),
    keep,
    drop,
    notes,
    warnings,
  })
  return {
    ok: true,
    kind: "pdf",
    document,
    plate: { ext: "svg", bytes: plate, contentType: "image/svg+xml" },
    sourceBytes: bytes,
    sourceExt: "pdf",
    sourceContentType: "application/pdf",
  }
}

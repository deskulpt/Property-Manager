import { inflateSync } from "node:zlib"
import {
  emptyPlanDraft,
  type PlanDraft,
  type PlanElement,
} from "@/lib/plan-draft"

export type PdfVectorSegment = {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type PdfVectorRect = {
  x: number
  y: number
  w: number
  h: number
}

export type PdfVectorExtract = {
  pageWidth: number
  pageHeight: number
  segments: PdfVectorSegment[]
  rects: PdfVectorRect[]
  streamCount: number
  inflatedBytes: number
}

/** Pull raw (possibly FlateDecode) content stream bodies from a PDF. */
export function extractPdfContentStreams(bytes: Buffer): Buffer[] {
  const streams: Buffer[] = []
  let i = 0
  while (i < bytes.length) {
    const streamIdx = bytes.indexOf(Buffer.from("stream"), i)
    if (streamIdx < 0) break
    // Find preceding dictionary for Filter
    const dictStart = bytes.lastIndexOf(Buffer.from("<<"), streamIdx)
    const dictSlice =
      dictStart >= 0 ? bytes.subarray(dictStart, streamIdx).toString("latin1") : ""
    let dataStart = streamIdx + 6
    if (bytes[dataStart] === 0x0d) dataStart++
    if (bytes[dataStart] === 0x0a) dataStart++
    const endIdx = bytes.indexOf(Buffer.from("endstream"), dataStart)
    if (endIdx < 0) break
    let dataEnd = endIdx
    if (dataEnd > dataStart && bytes[dataEnd - 1] === 0x0a) dataEnd--
    if (dataEnd > dataStart && bytes[dataEnd - 1] === 0x0d) dataEnd--
    const raw = bytes.subarray(dataStart, dataEnd)
    const filtered = /\/Filter\s*\/FlateDecode|\/FlateDecode/.test(dictSlice)
    try {
      streams.push(filtered ? inflateSync(raw) : Buffer.from(raw))
    } catch {
      // Skip corrupt / unsupported filters (e.g. DCTDecode images).
    }
    i = endIdx + 9
  }
  return streams
}

/**
 * Parse PDF path operators (m / l / re / h / c approximate) from content text.
 * Coordinates stay in PDF user space (origin bottom-left).
 */
export function parsePdfPathOps(content: string): {
  segments: PdfVectorSegment[]
  rects: PdfVectorRect[]
} {
  const tokens = content.match(/-?\d*\.?\d+(?:e[-+]?\d+)?|[A-Za-z]+/g) ?? []
  const segments: PdfVectorSegment[] = []
  const rects: PdfVectorRect[] = []
  const nums: number[] = []
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  let hasSub = false

  const pushNum = (n: number) => {
    nums.push(n)
    if (nums.length > 8) nums.shift()
  }

  for (const tok of tokens) {
    if (/^-?\d/.test(tok) || tok.startsWith(".")) {
      const n = Number(tok)
      if (Number.isFinite(n)) pushNum(n)
      continue
    }
    const op = tok
    if (op === "m" && nums.length >= 2) {
      cx = nums[nums.length - 2]
      cy = nums[nums.length - 1]
      sx = cx
      sy = cy
      hasSub = true
      nums.length = 0
    } else if (op === "l" && nums.length >= 2 && hasSub) {
      const x = nums[nums.length - 2]
      const y = nums[nums.length - 1]
      segments.push({ x1: cx, y1: cy, x2: x, y2: y })
      cx = x
      cy = y
      nums.length = 0
    } else if (op === "re" && nums.length >= 4) {
      const h = nums[nums.length - 1]
      const w = nums[nums.length - 2]
      const y = nums[nums.length - 3]
      const x = nums[nums.length - 4]
      if (Math.abs(w) > 1 && Math.abs(h) > 1) {
        rects.push({ x, y, w: Math.abs(w), h: Math.abs(h) })
      }
      nums.length = 0
      hasSub = false
    } else if (op === "h" && hasSub) {
      if (cx !== sx || cy !== sy) segments.push({ x1: cx, y1: cy, x2: sx, y2: sy })
      cx = sx
      cy = sy
      nums.length = 0
    } else if (op === "c" && nums.length >= 6 && hasSub) {
      // Approximate cubic as end-point chord for wall hints.
      const x = nums[nums.length - 2]
      const y = nums[nums.length - 1]
      segments.push({ x1: cx, y1: cy, x2: x, y2: y })
      cx = x
      cy = y
      nums.length = 0
    } else if (op === "v" || op === "y") {
      nums.length = 0
    } else if (
      op === "S" ||
      op === "s" ||
      op === "f" ||
      op === "F" ||
      op === "f*" ||
      op === "B" ||
      op === "b" ||
      op === "n"
    ) {
      hasSub = false
      nums.length = 0
    } else {
      // Unknown op — clear numeric stack to avoid false paths.
      if (/^[A-Za-z]/.test(op)) nums.length = 0
    }
  }

  return { segments, rects }
}

function boundsOf(
  segments: PdfVectorSegment[],
  rects: PdfVectorRect[],
  pageWidth: number,
  pageHeight: number,
) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of segments) {
    minX = Math.min(minX, s.x1, s.x2)
    minY = Math.min(minY, s.y1, s.y2)
    maxX = Math.max(maxX, s.x1, s.x2)
    maxY = Math.max(maxY, s.y1, s.y2)
  }
  for (const r of rects) {
    minX = Math.min(minX, r.x, r.x + r.w)
    minY = Math.min(minY, r.y, r.y + r.h)
    maxX = Math.max(maxX, r.x, r.x + r.w)
    maxY = Math.max(maxY, r.y, r.y + r.h)
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: pageWidth, maxY: pageHeight }
  }
  // Pad slightly so edge walls stay on plate.
  const padX = (maxX - minX) * 0.02 || 1
  const padY = (maxY - minY) * 0.02 || 1
  return {
    minX: minX - padX,
    minY: minY - padY,
    maxX: maxX + padX,
    maxY: maxY + padY,
  }
}

function toPct(value: number, min: number, max: number) {
  if (max - min < 1e-9) return 0
  return Math.min(100, Math.max(0, Math.round((((value - min) / (max - min)) * 100) * 10) / 10))
}

/** Flip PDF Y (bottom-left) into PlanDraft % (top-left). */
function toPctY(value: number, min: number, max: number) {
  return Math.min(100, Math.max(0, Math.round((100 - ((value - min) / (max - min)) * 100) * 10) / 10))
}

/**
 * Convert extracted vectors into a leasing PlanDraft (walls + unit-like rects).
 * Filters tiny noise; caps element count.
 */
export function pdfVectorsToDraft(
  extract: PdfVectorExtract,
  seed: number,
): { draft: PlanDraft; wallCount: number; unitCount: number } | null {
  if (extract.segments.length + extract.rects.length < 4) return null

  const box = boundsOf(extract.segments, extract.rects, extract.pageWidth, extract.pageHeight)
  const draft = emptyPlanDraft(10_000, "sqft")
  draft.seed = seed
  const elements: PlanElement[] = []
  let wallN = 0
  let unitN = 0

  const spanX = box.maxX - box.minX
  const spanY = box.maxY - box.minY
  const minSeg = Math.min(spanX, spanY) * 0.015

  for (const s of extract.segments) {
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1)
    if (len < minSeg) continue
    wallN++
    elements.push({
      id: `wall_${wallN}`,
      kind: "wall",
      x1: toPct(s.x1, box.minX, box.maxX),
      y1: toPctY(s.y1, box.minY, box.maxY),
      x2: toPct(s.x2, box.minX, box.maxX),
      y2: toPctY(s.y2, box.minY, box.maxY),
    })
    if (elements.length >= 180) break
  }

  // Prefer mid-size rects as unit / suite candidates (drop page frame + tiny ticks).
  const areaSpan = spanX * spanY
  const unitRects = extract.rects
    .map((r) => ({ ...r, area: r.w * r.h }))
    .filter((r) => r.area > areaSpan * 0.004 && r.area < areaSpan * 0.35)
    .sort((a, b) => b.area - a.area)
    .slice(0, 24)

  for (const r of unitRects) {
    unitN++
    const x = toPct(r.x, box.minX, box.maxX)
    const yTop = toPctY(r.y + r.h, box.minY, box.maxY)
    const x2 = toPct(r.x + r.w, box.minX, box.maxX)
    const yBot = toPctY(r.y, box.minY, box.maxY)
    const w = Math.max(1, x2 - x)
    const h = Math.max(1, yBot - yTop)
    const code = String.fromCharCode(64 + ((unitN - 1) % 26) + 1) + String(unitN)
    elements.push({
      id: `unit_${unitN}`,
      kind: "unit",
      x,
      y: yTop,
      w,
      h,
      label: `Unit ${code}`,
      unitCode: code,
    })
    // Door on south edge
    elements.push({
      id: `door_${unitN}`,
      kind: "door",
      x: Math.min(99, x + w / 2 - 2),
      y: Math.min(99, yTop + h - 1.5),
      w: 4,
      rotation: 0,
    })
    if (elements.length >= 198) break
  }

  if (wallN < 2 && unitN < 1) return null

  draft.elements = elements.slice(0, 200)
  draft.updatedAt = new Date().toISOString()
  return { draft, wallCount: wallN, unitCount: unitN }
}

/** Full PDF → vector extract (streams + path ops). */
export function extractPdfVectors(
  bytes: Buffer,
  pageWidth: number,
  pageHeight: number,
): PdfVectorExtract {
  const streams = extractPdfContentStreams(bytes)
  const segments: PdfVectorSegment[] = []
  const rects: PdfVectorRect[] = []
  let inflatedBytes = 0
  for (const stream of streams) {
    inflatedBytes += stream.byteLength
    // Skip obvious binary image payloads.
    const sample = stream.subarray(0, Math.min(stream.length, 64)).toString("latin1")
    if (/^\xff\xd8|^\x89PNG|^\x00\x00/.test(sample) && !/[mlre]\s/.test(stream.toString("latin1").slice(0, 200))) {
      continue
    }
    const text = stream.toString("latin1")
    if (!/\b(m|l|re|h|c)\b/.test(text)) continue
    const parsed = parsePdfPathOps(text)
    segments.push(...parsed.segments)
    rects.push(...parsed.rects)
  }
  return {
    pageWidth,
    pageHeight,
    segments: segments.slice(0, 2000),
    rects: rects.slice(0, 500),
    streamCount: streams.length,
    inflatedBytes,
  }
}

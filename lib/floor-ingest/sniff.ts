import type { FloorIngestKind } from "@/lib/floor-ingest/types"

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg"])

export function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename
  const dot = base.lastIndexOf(".")
  if (dot < 0) return ""
  return base.slice(dot + 1).toLowerCase()
}

/** Magic-byte + filename sniff for floor ingest uploads. */
export function sniffFloorIngest(
  bytes: Buffer,
  filename: string,
  contentType?: string | null,
): FloorIngestKind | null {
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "pdf"
  if (bytes.length >= 6 && bytes.subarray(0, 6).toString("ascii") === "AC1032") return "dwg"
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString("ascii") === "AC10") return "dwg"

  const ext = extensionOf(filename)
  const head = bytes.subarray(0, Math.min(bytes.length, 512)).toString("latin1").toUpperCase()
  if (ext === "dxf" || head.includes("SECTION") && head.includes("ENTITIES") || head.startsWith("0\r\nSECTION") || head.startsWith("0\nSECTION")) {
    if (ext === "dxf" || /(?:^|\n|\r)0\s*\nSECTION/i.test(bytes.subarray(0, 2048).toString("latin1"))) {
      return "dxf"
    }
  }
  if (ext === "dwg") return "dwg"
  if (ext === "pdf" || contentType === "application/pdf") return "pdf"
  if (IMAGE_EXTS.has(ext) || (contentType ?? "").startsWith("image/")) return "image"

  // PNG / JPEG / GIF / WebP magic
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return "image"
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image"
  if (bytes.length >= 6 && bytes.subarray(0, 6).toString("ascii") === "GIF87a") return "image"
  if (bytes.length >= 6 && bytes.subarray(0, 6).toString("ascii") === "GIF89a") return "image"
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image"
  }
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii").toLowerCase().startsWith("<?xml")) {
    if (bytes.includes(Buffer.from("<svg"))) return "image"
  }
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString("ascii").toLowerCase() === "<svg") return "image"

  return null
}

export function maxBytesForKind(kind: FloorIngestKind): number {
  if (kind === "dwg") return 20_000_000
  if (kind === "dxf") return 15_000_000
  if (kind === "pdf") return 12_000_000
  return 5_000_000
}

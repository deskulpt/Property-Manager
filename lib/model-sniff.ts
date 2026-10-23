/**
 * Content-based sniff for 3D building uploads (PRD §4.2).
 * Prefer magic bytes / header text over the client filename extension.
 */

export type ModelKind = "glb" | "gltf" | "ifc" | "obj"

export const MODEL_CAPS = {
  glb: 25 * 1024 * 1024,
  gltf: 25 * 1024 * 1024,
  obj: 25 * 1024 * 1024,
  ifc: 50 * 1024 * 1024,
} as const

export const MODEL_CONTENT_TYPES: Record<ModelKind, string> = {
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  obj: "text/plain",
  ifc: "application/x-step",
}

function startsWithAscii(bytes: Buffer, ascii: string, offset = 0) {
  if (bytes.length < offset + ascii.length) return false
  return bytes.subarray(offset, offset + ascii.length).toString("ascii") === ascii
}

/** Detect GLB / glTF / IFC / OBJ from the first chunk of the file. */
export function sniffModelKind(bytes: Buffer): ModelKind | null {
  if (bytes.length < 12) return null

  // glTF binary: magic "glTF" (0x46546C67 little-endian at offset 0)
  if (bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46) {
    return "glb"
  }

  const head = bytes.subarray(0, Math.min(bytes.length, 512)).toString("utf8")

  // JSON glTF
  if (/^\s*\{/.test(head) && /"asset"\s*:/.test(head) && /gltf/i.test(head)) {
    return "gltf"
  }

  // IFC STEP header
  if (/ISO-10303-21/i.test(head) || /FILE_SCHEMA\s*\(\s*\(\s*'IFC/i.test(head) || /^HEADER;/im.test(head)) {
    return "ifc"
  }

  // Wavefront OBJ — comment or element keywords near the top
  if (/^(?:#|\s*v\s|\s*vt\s|\s*vn\s|\s*f\s|\s*o\s|\s*g\s|\s*mtllib\s)/m.test(head)) {
    // Avoid mistaking plain text that happens to mention IFC
    if (!/ISO-10303-21/i.test(head)) return "obj"
  }

  // Some exporters write IFC without a long header in the first bytes — look for IFC entity
  if (startsWithAscii(bytes, "ISO-10303-21") || /\bIFCPROJECT\b/i.test(head)) {
    return "ifc"
  }

  return null
}

export function modelCapFor(kind: ModelKind): number {
  return MODEL_CAPS[kind]
}

export function rejectReasonForModel(bytes: Buffer, declaredSize: number): string | null {
  const kind = sniffModelKind(bytes)
  if (!kind) {
    return "Upload a glTF/GLB, IFC, or OBJ building model. The file contents did not match those formats."
  }
  const cap = modelCapFor(kind)
  if (declaredSize > cap || bytes.byteLength > cap) {
    const mb = Math.round(cap / (1024 * 1024))
    return `${kind.toUpperCase()} files must be ${mb} MB or smaller.`
  }
  return null
}

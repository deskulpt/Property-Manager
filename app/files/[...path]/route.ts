import fs from "node:fs/promises"
import path from "node:path"
import { isSafeObjectKey } from "@/lib/object-store"

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  obj: "text/plain",
  ifc: "application/x-step",
  txt: "text/plain; charset=utf-8",
}

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await context.params
  if (parts.length === 0 || parts.some((p) => p.includes("..") || p.includes("/") || p.includes("\\"))) {
    return new Response("Not found", { status: 404 })
  }

  // demoESign stamps: /files/esign/<id>.txt
  if (parts.length === 2 && parts[0] === "esign") {
    const name = parts[1]
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
      return new Response("Not found", { status: 404 })
    }
    const esignRoot = path.resolve(process.cwd(), "data", "esign")
    const filePath = path.resolve(esignRoot, name)
    if (!filePath.startsWith(esignRoot + path.sep)) {
      return new Response("Not found", { status: 404 })
    }
    return serveFile(filePath, name)
  }

  const key = parts.join("/")
  // Legacy flat uploads: single segment `name.ext`
  // ObjectStore keys: `tenant/kind/name.ext`
  const legacyOk = parts.length === 1 && /^[a-zA-Z0-9._-]+$/.test(parts[0])
  if (!legacyOk && !isSafeObjectKey(key)) {
    return new Response("Not found", { status: 404 })
  }

  const ext = parts[parts.length - 1]?.split(".").pop()?.toLowerCase() ?? ""
  if (!TYPES[ext]) {
    return new Response("Not found", { status: 404 })
  }

  const uploadsRoot = path.resolve(process.cwd(), "data", "uploads")
  const filePath = path.resolve(uploadsRoot, ...parts)
  if (!filePath.startsWith(uploadsRoot + path.sep)) {
    return new Response("Not found", { status: 404 })
  }

  return serveFile(filePath, parts[parts.length - 1]!)
}

async function serveFile(filePath: string, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (!TYPES[ext]) {
    return new Response("Not found", { status: 404 })
  }
  try {
    const bytes = await fs.readFile(filePath)
    const filename = name.replace(/"/g, "")
    return new Response(bytes, {
      headers: {
        "Content-Type": TYPES[ext],
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}

import fs from "node:fs/promises"
import path from "node:path"

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
}

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await context.params
  if (parts.length !== 1 || parts[0].includes("..") || parts[0].includes("/") || parts[0].includes("\\")) {
    return new Response("Not found", { status: 404 })
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(parts[0])) {
    return new Response("Not found", { status: 404 })
  }
  const ext = parts[0].split(".").pop()?.toLowerCase() ?? ""
  if (!TYPES[ext]) {
    return new Response("Not found", { status: 404 })
  }
  const uploadsRoot = path.resolve(process.cwd(), "data", "uploads")
  const filePath = path.resolve(uploadsRoot, parts[0])
  if (!filePath.startsWith(uploadsRoot + path.sep)) {
    return new Response("Not found", { status: 404 })
  }
  try {
    const bytes = await fs.readFile(filePath)
    return new Response(bytes, {
      headers: {
        "Content-Type": TYPES[ext],
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${parts[0].replace(/"/g, "")}"`,
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}

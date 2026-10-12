import fs from "node:fs/promises"
import path from "node:path"

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
}

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await context.params
  if (parts.length !== 1 || parts[0].includes("..") || parts[0].includes("/")) {
    return new Response("Not found", { status: 404 })
  }
  const filePath = path.join(process.cwd(), "data", "uploads", parts[0])
  try {
    const bytes = await fs.readFile(filePath)
    const ext = parts[0].split(".").pop()?.toLowerCase() ?? ""
    return new Response(bytes, {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}

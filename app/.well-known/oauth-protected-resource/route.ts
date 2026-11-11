import { mcpProtectedResourceMetadata } from "@/lib/mcp/oauth-tokens"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** D07 — OAuth protected-resource metadata (RFC 9728-shaped). */
export async function GET(): Promise<Response> {
  return Response.json(mcpProtectedResourceMetadata(), {
    headers: {
      "Cache-Control": "public, max-age=60",
    },
  })
}

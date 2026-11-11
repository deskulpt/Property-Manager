/**
 * Edge / front-door gate for `/api/mcp` (CTO D07 priority).
 *
 * Production and HOSTED deny the route until Eng clears with
 * `EASYRENTAL_MCP_EDGE_ALLOW=1`. Local/dev stays open (anonymous reads +
 * country guard still apply at the route).
 */

export function mcpEdgeBlocked(): boolean {
  const allow = process.env.EASYRENTAL_MCP_EDGE_ALLOW?.trim()
  if (allow === "1") return false

  const production = process.env.NODE_ENV === "production"
  const hosted = process.env.HOSTED === "1" || process.env.HOSTED === "true"
  return production || hosted
}

export function mcpEdgeDenyResponse(): Response {
  return Response.json(
    {
      ok: false,
      error: "MCP HTTP endpoint blocked at edge until Eng clears (set EASYRENTAL_MCP_EDGE_ALLOW=1).",
      code: "mcp_edge_blocked",
    },
    {
      status: 403,
      headers: {
        "cache-control": "no-store",
        "x-easyrental-mcp-edge": "blocked",
      },
    },
  )
}

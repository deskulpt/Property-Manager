import { bearerFromAuthorization } from "@/lib/mcp/session"
import { introspectMcpAccessToken } from "@/lib/mcp/oauth-tokens"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** RFC 7662-shaped introspection for er_pat_* tokens. */
export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  const token =
    (typeof body.token === "string" ? body.token : null) ??
    bearerFromAuthorization(req.headers.get("authorization"))

  const result = introspectMcpAccessToken(token)
  if (!result.active || !result.token) {
    return Response.json({ active: false, reason: result.reason ?? "inactive" })
  }

  return Response.json({
    active: true,
    token_type: "Bearer",
    client_id: result.token.clientId,
    username: result.token.userId,
    sub: result.token.userId,
    tenant_id: result.token.tenantId,
    aud: result.token.audience,
    scope: result.token.scopes.join(" "),
    iat: Math.floor(Date.parse(result.token.issuedAt) / 1000),
    exp: Math.floor(Date.parse(result.token.expiresAt) / 1000),
    token_id: result.token.id,
  })
}

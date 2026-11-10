import { getSessionUser } from "@/lib/session"
import { issueMcpAccessToken, mcpOauthMetadata } from "@/lib/mcp/oauth-tokens"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * D07 session-exchange token endpoint.
 * Full OAuth 2.1 auth-code + PKCE remains Pending (host cert matrix).
 * Issues a tenant-bound opaque PAT from an authenticated landlord/agent cookie session.
 */
export async function POST(req: Request): Promise<Response> {
  const user = await getSessionUser()
  if (!user?.id || !user.tenantId) {
    return Response.json({ error: "authentication_required" }, { status: 401 })
  }
  if (user.roleLevel != null && user.roleLevel > 3) {
    return Response.json({ error: "insufficient_role" }, { status: 403 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  const clientId =
    typeof body.client_id === "string" && body.client_id.trim()
      ? body.client_id.trim()
      : "session-exchange"
  const label = typeof body.label === "string" ? body.label : null
  const audience = typeof body.audience === "string" ? body.audience : undefined

  const issued = issueMcpAccessToken({
    userId: user.id,
    tenantId: user.tenantId,
    clientId,
    audience,
    label,
  })
  if (!issued.ok) {
    return Response.json({ error: issued.error, code: issued.code }, { status: 400 })
  }

  return Response.json({
    access_token: issued.issued.accessToken,
    token_type: issued.issued.tokenType,
    expires_in: issued.issued.expiresIn,
    scope: issued.issued.scope,
    audience: issued.issued.audience,
    client_id: issued.issued.clientId,
    token_id: issued.issued.tokenId,
    tenant_id: issued.issued.tenantId,
    // Never echo demo: shortcuts — live money flags stay OFF.
    live_money: false,
    metadata: mcpOauthMetadata(),
  })
}

export async function GET(): Promise<Response> {
  return Response.json(mcpOauthMetadata())
}

import { getSessionUser } from "@/lib/session"
import { exchangeMcpAuthCode } from "@/lib/mcp/oauth-pkce"
import { issueMcpAccessToken, mcpOauthMetadata } from "@/lib/mcp/oauth-tokens"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * D07 token endpoint — session-exchange PAT (default) or auth-code + PKCE
 * when grant_type=authorization_code and EASYRENTAL_MCP_OAUTH_PKCE=1.
 */
export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  const grantType =
    typeof body.grant_type === "string" ? body.grant_type.trim() : "urn:easyrental:session_exchange"

  if (grantType === "authorization_code") {
    const code = typeof body.code === "string" ? body.code : ""
    const clientId = typeof body.client_id === "string" ? body.client_id : ""
    const redirectUri = typeof body.redirect_uri === "string" ? body.redirect_uri : ""
    const codeVerifier = typeof body.code_verifier === "string" ? body.code_verifier : ""
    const exchanged = exchangeMcpAuthCode({ code, clientId, redirectUri, codeVerifier })
    if (!exchanged.ok) {
      return Response.json({ error: exchanged.code, message: exchanged.error }, { status: 400 })
    }
    return Response.json({
      access_token: exchanged.issued.accessToken,
      token_type: exchanged.issued.tokenType,
      expires_in: exchanged.issued.expiresIn,
      scope: exchanged.issued.scope,
      audience: exchanged.issued.audience,
      client_id: exchanged.issued.clientId,
      token_id: exchanged.issued.tokenId,
      tenant_id: exchanged.issued.tenantId,
      live_money: false,
      grant_type: "authorization_code",
      metadata: mcpOauthMetadata(),
    })
  }

  const user = await getSessionUser()
  if (!user?.id || !user.tenantId) {
    return Response.json({ error: "authentication_required" }, { status: 401 })
  }
  if (user.roleLevel != null && user.roleLevel > 3) {
    return Response.json({ error: "insufficient_role" }, { status: 403 })
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
    grant_type: "urn:easyrental:session_exchange",
    metadata: mcpOauthMetadata(),
  })
}

export async function GET(): Promise<Response> {
  return Response.json(mcpOauthMetadata())
}

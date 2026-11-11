import { getSessionUser } from "@/lib/session"
import { MCP_READ_SCOPE, MCP_PROPOSE_SCOPE } from "@/lib/mcp/policy"
import { issueMcpAuthCode, mcpPkceEnabled } from "@/lib/mcp/oauth-pkce"
import { mcpOauthMetadata } from "@/lib/mcp/oauth-tokens"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * D07 authorization endpoint (auth-code + PKCE S256).
 * Fail-closed unless EASYRENTAL_MCP_OAUTH_PKCE=1. Demo hosts use session-exchange.
 */
export async function GET(req: Request): Promise<Response> {
  if (!mcpPkceEnabled()) {
    return Response.json(
      {
        error: "authorization_code_disabled",
        message:
          "Auth-code + PKCE OFF. Use session-exchange PAT (POST /api/mcp/oauth/token) until host cert.",
        metadata: mcpOauthMetadata(),
      },
      { status: 403 },
    )
  }

  const user = await getSessionUser()
  if (!user?.id || !user.tenantId) {
    return Response.json({ error: "authentication_required" }, { status: 401 })
  }
  if (user.roleLevel != null && user.roleLevel > 3) {
    return Response.json({ error: "insufficient_role" }, { status: 403 })
  }

  const url = new URL(req.url)
  const clientId = url.searchParams.get("client_id")?.trim() || "mcp-host"
  const redirectUri = url.searchParams.get("redirect_uri")?.trim()
  const codeChallenge = url.searchParams.get("code_challenge")?.trim()
  const method = url.searchParams.get("code_challenge_method")?.trim() || "S256"
  const scopeParam = url.searchParams.get("scope")?.trim()
  if (!redirectUri || !codeChallenge) {
    return Response.json(
      { error: "invalid_request", message: "redirect_uri and code_challenge required" },
      { status: 400 },
    )
  }

  const scopes = scopeParam
    ? scopeParam.split(/\s+/).filter(Boolean)
    : [MCP_READ_SCOPE, ...(user.role === "landlord_admin" || user.role === "property_manager"
        ? [MCP_PROPOSE_SCOPE]
        : [])]

  const issued = issueMcpAuthCode({
    userId: user.id,
    tenantId: user.tenantId,
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod: method,
    scopes,
  })
  if (!issued.ok) {
    return Response.json({ error: issued.code, message: issued.error }, { status: 400 })
  }

  const redirect = new URL(redirectUri)
  redirect.searchParams.set("code", issued.code)
  const state = url.searchParams.get("state")
  if (state) redirect.searchParams.set("state", state)
  return Response.redirect(redirect.toString(), 302)
}

export async function POST(req: Request): Promise<Response> {
  // Same as GET for form posts from host consent UX.
  const url = new URL(req.url)
  let body: Record<string, string> = {}
  try {
    const form = await req.formData()
    for (const [k, v] of form.entries()) {
      if (typeof v === "string") body[k] = v
    }
  } catch {
    try {
      body = (await req.json()) as Record<string, string>
    } catch {
      body = {}
    }
  }
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === "string") url.searchParams.set(k, v)
  }
  return GET(new Request(url.toString(), { method: "GET", headers: req.headers }))
}

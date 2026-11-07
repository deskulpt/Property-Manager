import { getSessionUser } from "@/lib/session"
import { revokeMcpAccessToken } from "@/lib/mcp/oauth-tokens"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** RFC 7009-shaped revocation — tenant-scoped; requires cookie session. */
export async function POST(req: Request): Promise<Response> {
  const user = await getSessionUser()
  if (!user?.id || !user.tenantId) {
    return Response.json({ error: "authentication_required" }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  const token = typeof body.token === "string" ? body.token : null
  const tokenId = typeof body.token_id === "string" ? body.token_id : null
  const result = revokeMcpAccessToken({
    token,
    tokenId,
    tenantId: user.tenantId,
    actorUserId: user.id,
  })
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 })
  }
  // RFC 7009: always 200 even if already revoked / unknown within tenant scope.
  return Response.json({ revoked: result.revoked })
}

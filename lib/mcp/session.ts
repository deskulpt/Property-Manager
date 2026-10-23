import { getUser, type SessionUser } from "@/lib/db"
import type { Role } from "@/lib/format"
import { MCP_EXECUTE_PREAUTH_SCOPE, MCP_PROPOSE_SCOPE } from "@/lib/mcp/policy"
import { roleLevelFor, type RoleLevel } from "@/lib/mcp/role-level"

/**
 * MCP auth claims. tenant_id and role_level come from OAuth/PAT/session stub —
 * never from model tool arguments.
 */
export type McpSession = {
  userId: string | null
  role: Role | "anonymous"
  roleLevel: RoleLevel | null
  tenantId: string | null
  /**
   * M0: `read:*`. M1 landlord/agent: + `propose:*`.
   * `execute:preauthorized` is opt-in (env) and never unlocks never-auto tools.
   */
  scopes: readonly string[]
  user: SessionUser | null
}

export const MCP_READ_SCOPE = "read:*" as const
export { MCP_PROPOSE_SCOPE, MCP_EXECUTE_PREAUTH_SCOPE }

export function anonymousSession(): McpSession {
  return {
    userId: null,
    role: "anonymous",
    roleLevel: null,
    tenantId: null,
    scopes: [MCP_READ_SCOPE],
    user: null,
  }
}

function scopesForUser(user: SessionUser): string[] {
  const scopes: string[] = [MCP_READ_SCOPE]
  const level = roleLevelFor(user.role)
  // Landlord org + managing agent get propose (M1). Viewer seat matrix still Planned —
  // today every landlord seed is flat landlord_admin.
  if (level === 2 || level === 3) {
    scopes.push(MCP_PROPOSE_SCOPE)
  }
  // Narrow preauth for non-never-auto soft drafts only (M2 foreshadow; off by default).
  if (
    (level === 2 || level === 3) &&
    process.env.EASYRENTAL_MCP_EXECUTE_PREAUTH === "1"
  ) {
    scopes.push(MCP_EXECUTE_PREAUTH_SCOPE)
  }
  return scopes
}

export function sessionFromUser(user: SessionUser): McpSession {
  return {
    userId: user.id,
    role: user.role,
    roleLevel: roleLevelFor(user.role),
    tenantId: user.tenantId,
    scopes: scopesForUser(user),
    user,
  }
}

/**
 * Resolve a short-lived PAT / OAuth stub token to a session.
 *
 * Accepted demo forms (M0 stub — replace with OAuth 2.1 later):
 * - `demo:<userId>` e.g. `demo:u_nadia`
 * - bare seeded user id when `EASYRENTAL_MCP_ALLOW_BARE_IDS=1` (local only)
 * - JSON map in `EASYRENTAL_MCP_TOKENS` : `{ "my-pat": "u_nadia" }`
 * - empty / missing → anonymous (public search_listings only)
 */
export function resolveMcpToken(token: string | null | undefined): McpSession {
  const raw = token?.trim()
  if (!raw) return anonymousSession()

  const mapped = tokenMap()[raw]
  const userId = mapped ?? parseDemoToken(raw)
  if (!userId) return anonymousSession()

  const user = getUser(userId)
  if (!user) return anonymousSession()
  return sessionFromUser(user)
}

function parseDemoToken(raw: string): string | null {
  if (raw.startsWith("demo:")) {
    const id = raw.slice("demo:".length).trim()
    return id || null
  }
  if (process.env.EASYRENTAL_MCP_ALLOW_BARE_IDS === "1" && /^[a-zA-Z0-9_-]+$/.test(raw)) {
    return raw
  }
  return null
}

function tokenMap(): Record<string, string> {
  const json = process.env.EASYRENTAL_MCP_TOKENS?.trim()
  if (!json) return {}
  try {
    const parsed = JSON.parse(json) as unknown
    if (!parsed || typeof parsed !== "object") return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim()
    }
    return out
  } catch {
    return {}
  }
}

/** Extract Bearer token from an Authorization header. */
export function bearerFromAuthorization(header: string | null | undefined): string | null {
  if (!header) return null
  const m = header.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() || null
}

export function sessionFromRequestHeaders(headers: Headers | { get(name: string): string | null }): McpSession {
  const auth = headers.get("authorization")
  const token =
    bearerFromAuthorization(auth) ??
    headers.get("x-easyrental-mcp-token") ??
    process.env.EASYRENTAL_MCP_DEFAULT_TOKEN ??
    null
  return resolveMcpToken(token)
}

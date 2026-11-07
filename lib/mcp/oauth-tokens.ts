/**
 * D07 — tenant-bound MCP access tokens (production PAT / OAuth-shaped grant).
 *
 * Opaque tokens are stored hashed. Tenant + user bind server-side from the grant
 * row — never from model-supplied tenant_id. Revocation + expiry are enforced
 * at resolve time. Full OAuth 2.1 authorization-code + discovery is still
 * Pending (host cert matrix); this is the production-safe token store fallback.
 */
import { createHash, randomBytes } from "node:crypto"
import { getDb, getUser, type SessionUser } from "@/lib/db"
import { MCP_EXECUTE_PREAUTH_SCOPE, MCP_PROPOSE_SCOPE } from "@/lib/mcp/policy"
import { roleLevelFor } from "@/lib/mcp/role-level"
import type { McpSession } from "@/lib/mcp/session"

export const MCP_TOKEN_PREFIX = "er_pat_" as const
export const MCP_TOKEN_AUDIENCE_DEFAULT = "easyrental.mcp" as const
export const MCP_OAUTH_ISSUER = "https://easyrental.space/mcp/oauth" as const
export const MCP_READ_SCOPE = "read:*" as const

/** Default access-token lifetime (1 hour). Override with EASYRENTAL_MCP_TOKEN_TTL_SECONDS. */
export function mcpAccessTokenTtlSeconds(): number {
  const raw = process.env.EASYRENTAL_MCP_TOKEN_TTL_SECONDS?.trim()
  const n = raw ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 60 && n <= 86_400 * 30) return Math.floor(n)
  return 3_600
}

export type McpAccessTokenRow = {
  id: string
  tokenHash: string
  tokenPrefix: string
  userId: string
  tenantId: string
  clientId: string
  audience: string
  scopes: readonly string[]
  issuedAt: string
  expiresAt: string
  revokedAt: string | null
  lastUsedAt: string | null
  label: string | null
}

export type IssuedMcpToken = {
  /** Shown once — never re-readable. */
  accessToken: string
  tokenType: "Bearer"
  expiresIn: number
  scope: string
  audience: string
  clientId: string
  tokenId: string
  userId: string
  tenantId: string
  issuedAt: string
  expiresAt: string
}

function hashToken(raw: string): string {
  return createHash("sha256").update(`v1:mcp-pat:${raw}`).digest("hex")
}

function parseScopes(json: string): string[] {
  try {
    const parsed = JSON.parse(json) as unknown
    if (!Array.isArray(parsed)) return [MCP_READ_SCOPE]
    return parsed.filter((s): s is string => typeof s === "string" && s.length > 0)
  } catch {
    return [MCP_READ_SCOPE]
  }
}

function mapRow(row: Record<string, unknown>): McpAccessTokenRow {
  return {
    id: String(row.id),
    tokenHash: String(row.token_hash),
    tokenPrefix: String(row.token_prefix),
    userId: String(row.user_id),
    tenantId: String(row.tenant_id),
    clientId: String(row.client_id),
    audience: String(row.audience),
    scopes: parseScopes(String(row.scopes_json)),
    issuedAt: String(row.issued_at),
    expiresAt: String(row.expires_at),
    revokedAt: row.revoked_at == null ? null : String(row.revoked_at),
    lastUsedAt: row.last_used_at == null ? null : String(row.last_used_at),
    label: row.label == null ? null : String(row.label),
  }
}

function defaultScopesForUser(user: SessionUser): string[] {
  const scopes: string[] = [MCP_READ_SCOPE]
  if (user.role === "landlord_admin" || user.role === "property_manager") {
    scopes.push(MCP_PROPOSE_SCOPE)
  }
  if (process.env.EASYRENTAL_MCP_EXECUTE_PREAUTH === "1") {
    scopes.push(MCP_EXECUTE_PREAUTH_SCOPE)
  }
  return scopes
}

/**
 * Issue a tenant-bound opaque access token.
 * Caller must already be an authenticated human for that tenant (session/cookie).
 */
export function issueMcpAccessToken(input: {
  userId: string
  tenantId: string
  clientId: string
  audience?: string
  scopes?: readonly string[]
  label?: string | null
  ttlSeconds?: number
}):
  | { ok: true; issued: IssuedMcpToken }
  | { ok: false; error: string; code: "user_not_found" | "tenant_mismatch" | "no_tenant" } {
  const user = getUser(input.userId)
  if (!user) return { ok: false, error: "User not found.", code: "user_not_found" }
  if (!user.tenantId) return { ok: false, error: "User has no tenant binding.", code: "no_tenant" }
  if (user.tenantId !== input.tenantId) {
    return { ok: false, error: "tenant_id must match the authenticated user's tenant.", code: "tenant_mismatch" }
  }

  const ttl = input.ttlSeconds ?? mcpAccessTokenTtlSeconds()
  const issuedAt = new Date()
  const expiresAt = new Date(issuedAt.getTime() + ttl * 1000)
  const raw = `${MCP_TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`
  const id = crypto.randomUUID()
  const scopes = input.scopes?.length ? [...input.scopes] : defaultScopesForUser(user)
  const audience = input.audience?.trim() || MCP_TOKEN_AUDIENCE_DEFAULT
  const clientId = input.clientId.trim() || "unknown-client"

  getDb()
    .prepare(
      `INSERT INTO mcp_access_tokens
        (id, token_hash, token_prefix, user_id, tenant_id, client_id, audience,
         scopes_json, issued_at, expires_at, revoked_at, last_used_at, label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
    )
    .run(
      id,
      hashToken(raw),
      raw.slice(0, 12),
      user.id,
      user.tenantId,
      clientId,
      audience,
      JSON.stringify(scopes),
      issuedAt.toISOString(),
      expiresAt.toISOString(),
      input.label?.trim() || null,
    )

  return {
    ok: true,
    issued: {
      accessToken: raw,
      tokenType: "Bearer",
      expiresIn: ttl,
      scope: scopes.join(" "),
      audience,
      clientId,
      tokenId: id,
      userId: user.id,
      tenantId: user.tenantId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
  }
}

export function revokeMcpAccessToken(input: {
  token?: string | null
  tokenId?: string | null
  tenantId: string
  actorUserId: string
}): { ok: true; revoked: boolean } | { ok: false; error: string } {
  const now = new Date().toISOString()
  const db = getDb()

  if (input.tokenId?.trim()) {
    const result = db
      .prepare(
        `UPDATE mcp_access_tokens
         SET revoked_at = COALESCE(revoked_at, ?)
         WHERE id = ? AND tenant_id = ?`,
      )
      .run(now, input.tokenId.trim(), input.tenantId)
    void input.actorUserId
    return { ok: true, revoked: Number(result.changes) > 0 }
  }

  const raw = input.token?.trim()
  if (!raw) return { ok: false, error: "token or token_id required." }

  const result = db
    .prepare(
      `UPDATE mcp_access_tokens
       SET revoked_at = COALESCE(revoked_at, ?)
       WHERE token_hash = ? AND tenant_id = ?`,
    )
    .run(now, hashToken(raw), input.tenantId)
  return { ok: true, revoked: Number(result.changes) > 0 }
}

export function introspectMcpAccessToken(raw: string | null | undefined): {
  active: boolean
  token?: McpAccessTokenRow
  reason?: "missing" | "unknown" | "revoked" | "expired"
} {
  const token = raw?.trim()
  if (!token) return { active: false, reason: "missing" }
  if (!token.startsWith(MCP_TOKEN_PREFIX)) return { active: false, reason: "unknown" }

  const row = getDb()
    .prepare("SELECT * FROM mcp_access_tokens WHERE token_hash = ?")
    .get(hashToken(token)) as Record<string, unknown> | undefined
  if (!row) return { active: false, reason: "unknown" }

  const mapped = mapRow(row)
  if (mapped.revokedAt) return { active: false, token: mapped, reason: "revoked" }
  if (Date.parse(mapped.expiresAt) <= Date.now()) {
    return { active: false, token: mapped, reason: "expired" }
  }
  return { active: true, token: mapped }
}

/**
 * Resolve an opaque er_pat_* token to an MCP session.
 * Tenant comes only from the grant row (fail-closed on mismatch with user.tenantId).
 */
export function resolveStoredMcpToken(raw: string | null | undefined): McpSession | null {
  const result = introspectMcpAccessToken(raw)
  if (!result.active || !result.token) return null

  const user = getUser(result.token.userId)
  if (!user || !user.tenantId) return null
  if (user.tenantId !== result.token.tenantId) return null

  getDb()
    .prepare("UPDATE mcp_access_tokens SET last_used_at = ? WHERE id = ?")
    .run(new Date().toISOString(), result.token.id)

  const roleScopes = defaultScopesForUser(user)
  const granted = new Set(result.token.scopes)
  // Intersect granted scopes with role-derived scopes (never elevate).
  const scopes = roleScopes.filter((s) => granted.has(s))
  if (!scopes.includes(MCP_READ_SCOPE)) scopes.unshift(MCP_READ_SCOPE)
  return {
    userId: user.id,
    role: user.role,
    roleLevel: roleLevelFor(user.role),
    tenantId: user.tenantId,
    scopes,
    user,
  }
}

export function listMcpAccessTokensForTenant(tenantId: string): McpAccessTokenRow[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM mcp_access_tokens
       WHERE tenant_id = ?
       ORDER BY issued_at DESC`,
    )
    .all(tenantId) as Record<string, unknown>[]
  return rows.map(mapRow)
}

export function mcpOauthMetadata() {
  return {
    issuer: MCP_OAUTH_ISSUER,
    token_endpoint: "/api/mcp/oauth/token",
    revocation_endpoint: "/api/mcp/oauth/revoke",
    introspection_endpoint: "/api/mcp/oauth/introspect",
    grant_types_supported: ["client_credentials", "urn:easyrental:session_exchange"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [MCP_READ_SCOPE, MCP_PROPOSE_SCOPE, MCP_EXECUTE_PREAUTH_SCOPE],
    response_types_supported: ["token"],
    /** Full auth-code + PKCE discovery still Pending (host cert matrix). */
    authorization_code_pending: true,
    audience: MCP_TOKEN_AUDIENCE_DEFAULT,
  }
}

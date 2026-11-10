/**
 * D07 — OAuth 2.1 authorization-code + PKCE (S256) store.
 *
 * Session-exchange PAT remains the demo-safe path. Auth-code+PKCE is
 * implemented server-side but **fail-closed for host certification**:
 * codes issue only when EASYRENTAL_MCP_OAUTH_PKCE=1 AND a host is not
 * falsely marked certified. Full host UX / discovery still Pending.
 *
 * Edge-block of /api/mcp in production is owned by sibling CTO Eng
 * priority fixes — stack with that PR; do not duplicate here.
 */
import { createHash, randomBytes } from "node:crypto"
import { getDb } from "@/lib/db"
import { assertNoFalseHostClaims } from "@/lib/mcp/host-cert-matrix"
import {
  issueMcpAccessToken,
  MCP_TOKEN_AUDIENCE_DEFAULT,
  type IssuedMcpToken,
} from "@/lib/mcp/oauth-tokens"

export const MCP_OAUTH_CODE_PREFIX = "er_ac_" as const
export const MCP_PKCE_METHOD_S256 = "S256" as const

let schemaReadyFor: string | null = null

function ensureOauthCodeSchema() {
  const dbPath = process.env.DESKULPT_DB_PATH ?? ":memory:"
  if (schemaReadyFor === dbPath) return
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS mcp_oauth_auth_codes (
      code_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      code_challenge_method TEXT NOT NULL,
      scopes_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_mcp_oauth_codes_tenant
      ON mcp_oauth_auth_codes(tenant_id, created_at);
  `)
  schemaReadyFor = dbPath
}

function hashCode(raw: string): string {
  return createHash("sha256").update(`v1:mcp-ac:${raw}`).digest("hex")
}

export function pkceChallengeS256(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url")
}

export function mcpPkceEnabled(): boolean {
  return process.env.EASYRENTAL_MCP_OAUTH_PKCE === "1"
}

export type IssueAuthCodeInput = {
  userId: string
  tenantId: string
  clientId: string
  redirectUri: string
  codeChallenge: string
  codeChallengeMethod?: string
  scopes: readonly string[]
  ttlSeconds?: number
}

export function issueMcpAuthCode(input: IssueAuthCodeInput):
  | { ok: true; code: string; expiresIn: number; expiresAt: string }
  | { ok: false; code: string; error: string } {
  ensureOauthCodeSchema()
  if (!mcpPkceEnabled()) {
    return {
      ok: false,
      code: "pkce_flag_off",
      error: "OAuth auth-code + PKCE is OFF (EASYRENTAL_MCP_OAUTH_PKCE≠1). Session-exchange PAT only.",
    }
  }
  const hosts = assertNoFalseHostClaims()
  if (!hosts.ok) {
    return {
      ok: false,
      code: "false_host_cert",
      error: `Host cert matrix has false certified hosts: ${hosts.offenders.join(",")}`,
    }
  }
  const method = input.codeChallengeMethod ?? MCP_PKCE_METHOD_S256
  if (method !== MCP_PKCE_METHOD_S256) {
    return { ok: false, code: "bad_challenge_method", error: "Only S256 PKCE is supported." }
  }
  if (!input.codeChallenge.trim()) {
    return { ok: false, code: "missing_challenge", error: "code_challenge required." }
  }
  const ttl = Math.min(600, Math.max(60, input.ttlSeconds ?? 300))
  const raw = `${MCP_OAUTH_CODE_PREFIX}${randomBytes(24).toString("base64url")}`
  const createdAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()
  getDb()
    .prepare(
      `INSERT INTO mcp_oauth_auth_codes
        (code_hash, user_id, tenant_id, client_id, redirect_uri, code_challenge,
         code_challenge_method, scopes_json, created_at, expires_at, consumed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    )
    .run(
      hashCode(raw),
      input.userId,
      input.tenantId,
      input.clientId,
      input.redirectUri,
      input.codeChallenge,
      method,
      JSON.stringify([...input.scopes]),
      createdAt,
      expiresAt,
    )
  return { ok: true, code: raw, expiresIn: ttl, expiresAt }
}

export function exchangeMcpAuthCode(input: {
  code: string
  clientId: string
  redirectUri: string
  codeVerifier: string
}):
  | { ok: true; issued: IssuedMcpToken }
  | { ok: false; code: string; error: string } {
  ensureOauthCodeSchema()
  if (!mcpPkceEnabled()) {
    return {
      ok: false,
      code: "pkce_flag_off",
      error: "OAuth auth-code + PKCE is OFF.",
    }
  }
  const raw = input.code.trim()
  if (!raw.startsWith(MCP_OAUTH_CODE_PREFIX)) {
    return { ok: false, code: "invalid_code", error: "Unknown authorization code." }
  }
  const row = getDb()
    .prepare("SELECT * FROM mcp_oauth_auth_codes WHERE code_hash = ?")
    .get(hashCode(raw)) as Record<string, unknown> | undefined
  if (!row) return { ok: false, code: "invalid_code", error: "Unknown authorization code." }
  if (row.consumed_at != null) {
    return { ok: false, code: "replay", error: "Authorization code already used." }
  }
  if (Date.parse(String(row.expires_at)) <= Date.now()) {
    return { ok: false, code: "expired", error: "Authorization code expired." }
  }
  if (String(row.client_id) !== input.clientId) {
    return { ok: false, code: "client_mismatch", error: "client_id mismatch." }
  }
  if (String(row.redirect_uri) !== input.redirectUri) {
    return { ok: false, code: "redirect_mismatch", error: "redirect_uri mismatch." }
  }
  const expected = String(row.code_challenge)
  const actual = pkceChallengeS256(input.codeVerifier)
  if (expected !== actual) {
    return { ok: false, code: "pkce_failed", error: "PKCE S256 verification failed." }
  }

  const consumed = getDb()
    .prepare(
      `UPDATE mcp_oauth_auth_codes SET consumed_at = ?
       WHERE code_hash = ? AND consumed_at IS NULL`,
    )
    .run(new Date().toISOString(), hashCode(raw))
  if (Number(consumed.changes) !== 1) {
    return { ok: false, code: "race", error: "Authorization code race — already consumed." }
  }

  let scopes: string[] = []
  try {
    const parsed = JSON.parse(String(row.scopes_json)) as unknown
    if (Array.isArray(parsed)) scopes = parsed.filter((s): s is string => typeof s === "string")
  } catch {
    scopes = []
  }

  const issued = issueMcpAccessToken({
    userId: String(row.user_id),
    tenantId: String(row.tenant_id),
    clientId: String(row.client_id),
    audience: MCP_TOKEN_AUDIENCE_DEFAULT,
    scopes,
    label: "oauth-auth-code",
  })
  if (!issued.ok) {
    return { ok: false, code: issued.code, error: issued.error }
  }
  return { ok: true, issued: issued.issued }
}

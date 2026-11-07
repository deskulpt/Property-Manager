import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useTempDatabase } from "./helpers/temp-db"
import { getDb } from "@/lib/db"
import {
  issueMcpAccessToken,
  introspectMcpAccessToken,
  revokeMcpAccessToken,
  resolveMcpToken,
  MCP_TOKEN_PREFIX,
  assertNoFalseHostClaims,
  MCP_HOST_CERT_MATRIX,
} from "@/lib/mcp"

useTempDatabase()

async function bootDb() {
  const { closeDatabase, getDb } = await import("@/lib/db")
  closeDatabase()
  getDb()
}

describe("D07 MCP OAuth / tenant-bound tokens", () => {
  beforeEach(async () => {
    await bootDb()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("issues a tenant-bound er_pat_* token and resolves session from grant", () => {
    const issued = issueMcpAccessToken({
      userId: "u_nadia",
      tenantId: "t_bbm",
      clientId: "cursor-mcp",
      label: "test",
    })
    expect(issued.ok).toBe(true)
    if (!issued.ok) return
    expect(issued.issued.accessToken.startsWith(MCP_TOKEN_PREFIX)).toBe(true)
    expect(issued.issued.tenantId).toBe("t_bbm")

    const session = resolveMcpToken(issued.issued.accessToken)
    expect(session.userId).toBe("u_nadia")
    expect(session.tenantId).toBe("t_bbm")
    expect(session.scopes).toContain("read:*")
    expect(session.scopes).toContain("propose:*")
  })

  it("rejects tenant_id mismatch on issue", () => {
    const issued = issueMcpAccessToken({
      userId: "u_nadia",
      tenantId: "t_other",
      clientId: "bad",
    })
    expect(issued.ok).toBe(false)
    if (issued.ok) return
    expect(issued.code).toBe("tenant_mismatch")
  })

  it("revokes tokens and fails closed on resolve", () => {
    const issued = issueMcpAccessToken({
      userId: "u_nadia",
      tenantId: "t_bbm",
      clientId: "cursor-mcp",
    })
    expect(issued.ok).toBe(true)
    if (!issued.ok) return

    const revoked = revokeMcpAccessToken({
      token: issued.issued.accessToken,
      tenantId: "t_bbm",
      actorUserId: "u_nadia",
    })
    expect(revoked.ok).toBe(true)
    if (!revoked.ok) return
    expect(revoked.revoked).toBe(true)

    expect(introspectMcpAccessToken(issued.issued.accessToken).active).toBe(false)
    expect(resolveMcpToken(issued.issued.accessToken).userId).toBeNull()
  })

  it("expires tokens", () => {
    const issued = issueMcpAccessToken({
      userId: "u_nadia",
      tenantId: "t_bbm",
      clientId: "cursor-mcp",
      ttlSeconds: 60,
    })
    expect(issued.ok).toBe(true)
    if (!issued.ok) return

    // Force expiry in DB
    getDb()
      .prepare("UPDATE mcp_access_tokens SET expires_at = ? WHERE id = ?")
      .run("2000-01-01T00:00:00.000Z", issued.issued.tokenId)

    expect(introspectMcpAccessToken(issued.issued.accessToken).reason).toBe("expired")
    expect(resolveMcpToken(issued.issued.accessToken).role).toBe("anonymous")
  })

  it("works in production without demo tokens", () => {
    vi.stubEnv("NODE_ENV", "production")
    delete process.env.EASYRENTAL_MCP_ALLOW_DEMO
    delete process.env.ALLOW_DEMO_AUTH

    expect(resolveMcpToken("demo:u_nadia").userId).toBeNull()

    const issued = issueMcpAccessToken({
      userId: "u_nadia",
      tenantId: "t_bbm",
      clientId: "prod-client",
    })
    expect(issued.ok).toBe(true)
    if (!issued.ok) return
    expect(resolveMcpToken(issued.issued.accessToken).userId).toBe("u_nadia")
  })

  it("host cert matrix starts with zero certified hosts", () => {
    expect(assertNoFalseHostClaims()).toEqual({ ok: true })
    expect(MCP_HOST_CERT_MATRIX.every((h) => h.status !== "certified")).toBe(true)
  })
})

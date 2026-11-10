import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useTempDatabase } from "./helpers/temp-db"
import { mcpDemoTokensAllowed, resolveMcpToken } from "@/lib/mcp"

useTempDatabase()

async function bootDb() {
  const { closeDatabase, getDb } = await import("@/lib/db")
  closeDatabase()
  getDb()
}

describe("MCP demo auth fail-closed (CTO gate)", () => {
  const envKeys = [
    "NODE_ENV",
    "HOSTED",
    "ALLOW_DEMO_AUTH",
    "EASYRENTAL_MCP_ALLOW_DEMO",
    "EASYRENTAL_MCP_ALLOW_BARE_IDS",
    "EASYRENTAL_MCP_TOKENS",
  ] as const
  const prev: Record<string, string | undefined> = {}

  beforeEach(async () => {
    for (const k of envKeys) prev[k] = process.env[k]
    await bootDb()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    for (const k of envKeys) {
      if (k === "NODE_ENV") continue
      if (prev[k] === undefined) delete process.env[k]
      else process.env[k] = prev[k]
    }
  })

  it("allows demo: tokens in local OSS by default", () => {
    vi.stubEnv("NODE_ENV", "test")
    delete process.env.HOSTED
    delete process.env.EASYRENTAL_MCP_ALLOW_DEMO
    expect(mcpDemoTokensAllowed()).toBe(true)
    const session = resolveMcpToken("demo:u_nadia")
    expect(session.userId).toBe("u_nadia")
    expect(session.tenantId).toBe("t_bbm")
  })

  it("rejects demo: tokens in production (anonymous, no elevation)", () => {
    vi.stubEnv("NODE_ENV", "production")
    delete process.env.HOSTED
    delete process.env.EASYRENTAL_MCP_ALLOW_DEMO
    delete process.env.ALLOW_DEMO_AUTH
    expect(mcpDemoTokensAllowed()).toBe(false)
    const session = resolveMcpToken("demo:u_nadia")
    expect(session.userId).toBeNull()
    expect(session.role).toBe("anonymous")
    expect(session.scopes).toEqual(["read:*"])
  })

  it("rejects demo: tokens when HOSTED without dual opt-in", () => {
    process.env.HOSTED = "1"
    delete process.env.EASYRENTAL_MCP_ALLOW_DEMO
    delete process.env.ALLOW_DEMO_AUTH
    expect(mcpDemoTokensAllowed()).toBe(false)
    expect(resolveMcpToken("demo:u_nadia").userId).toBeNull()
  })

  it("rejects bare ids even when ALLOW_BARE_IDS=1 in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    process.env.EASYRENTAL_MCP_ALLOW_BARE_IDS = "1"
    expect(resolveMcpToken("u_nadia").userId).toBeNull()
  })

  it("still resolves mapped PAT tokens in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    process.env.EASYRENTAL_MCP_TOKENS = JSON.stringify({ "pat-test": "u_nadia" })
    const session = resolveMcpToken("pat-test")
    expect(session.userId).toBe("u_nadia")
    expect(session.roleLevel).toBe(2)
  })

  it("requires dual opt-in to re-enable demo tokens in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    process.env.EASYRENTAL_MCP_ALLOW_DEMO = "1"
    process.env.ALLOW_DEMO_AUTH = "1"
    expect(mcpDemoTokensAllowed()).toBe(true)
    expect(resolveMcpToken("demo:u_nadia").userId).toBe("u_nadia")
  })
})

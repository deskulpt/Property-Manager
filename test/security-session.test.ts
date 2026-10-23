import { afterEach, describe, expect, it, vi } from "vitest"
import { mintSessionValue, parseSessionValue } from "@/lib/session"

describe("signed session cookies", () => {
  const prev = process.env.DESKULPT_SECRET_KEY

  afterEach(() => {
    if (prev === undefined) delete process.env.DESKULPT_SECRET_KEY
    else process.env.DESKULPT_SECRET_KEY = prev
    vi.unstubAllEnvs()
  })

  it("round-trips a signed value", () => {
    process.env.DESKULPT_SECRET_KEY = "test-secret-key-32chars-minimum"
    const minted = mintSessionValue("u_nadia")
    expect(minted.startsWith("v1.u_nadia.")).toBe(true)
    expect(parseSessionValue(minted)).toBe("u_nadia")
  })

  it("rejects tampered signatures", () => {
    process.env.DESKULPT_SECRET_KEY = "test-secret-key-32chars-minimum"
    const minted = mintSessionValue("u_nadia")
    const bad = minted.slice(0, -4) + "xxxx"
    expect(parseSessionValue(bad)).toBeNull()
  })

  it("rejects raw user ids in production", () => {
    process.env.DESKULPT_SECRET_KEY = "test-secret-key-32chars-minimum"
    vi.stubEnv("NODE_ENV", "production")
    expect(parseSessionValue("u_avery")).toBeNull()
  })
})

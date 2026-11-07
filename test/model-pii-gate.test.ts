import { afterEach, describe, expect, it, vi } from "vitest"
import {
  liveModelConfigured,
  liveModelEnabled,
  minimizePlanTurnForModel,
  redactPiiForModel,
} from "@/lib/agentic/model"

describe("model PII minimization + live gate (CTO gate)", () => {
  afterEach(() => {
    delete process.env.ASK_EASY_LIVE_MODEL
    delete process.env.ASK_EASY_MODEL_API_KEY
    delete process.env.GEMINI_API_KEY
    delete process.env.GOOGLE_GENAI_API_KEY
    delete process.env.GOOGLE_API_KEY
    vi.unstubAllEnvs()
  })

  it("liveModelConfigured is false when key present but ASK_EASY_LIVE_MODEL unset", () => {
    process.env.ASK_EASY_MODEL_API_KEY = "sk-test-key-long-enough"
    delete process.env.ASK_EASY_LIVE_MODEL
    expect(liveModelEnabled()).toBe(false)
    expect(liveModelConfigured()).toBe(false)
  })

  it("liveModelConfigured requires explicit ASK_EASY_LIVE_MODEL=1 and key", () => {
    process.env.ASK_EASY_MODEL_API_KEY = "sk-test-key-long-enough"
    process.env.ASK_EASY_LIVE_MODEL = "1"
    expect(liveModelEnabled()).toBe(true)
    expect(liveModelConfigured()).toBe(true)
  })

  it("redacts email, phone, aadhaar, PAN from prompts", () => {
    const raw =
      "Call Priya at +91 98765 43210 or priya@apex.example — Aadhaar 2345 6789 0123 PAN ABCDE1234F"
    const redacted = redactPiiForModel(raw)
    expect(redacted).not.toMatch(/priya@apex\.example/i)
    expect(redacted).toContain("[REDACTED_EMAIL]")
    expect(redacted).toContain("[REDACTED_PHONE]")
    expect(redacted).toContain("[REDACTED_AADHAAR]")
    expect(redacted).toContain("[REDACTED_PAN]")
    expect(redacted).not.toMatch(/2345\s*6789\s*0123/)
    expect(redacted).not.toMatch(/ABCDE1234F/)
  })

  it("minimizePlanTurnForModel drops raw tenantId from outbound payload", () => {
    const minimized = minimizePlanTurnForModel({
      tenantId: "t_bbm",
      prompt: "Email maya@apex.example about bay B1",
      propertyId: "p_waterman",
      unitId: "u_waterman_b1",
      onboard: false,
    })
    expect(minimized).not.toHaveProperty("tenantId")
    expect(minimized.tenantRef).toBe("session")
    expect(minimized.prompt).toContain("[REDACTED_EMAIL]")
    expect(minimized.prompt).not.toContain("maya@apex.example")
  })
})

import "server-only"
import { runAskEasyStub, type AskEasyTurnResult } from "@/lib/agentic/runtime"

/**
 * Deterministic stub “model” — no LLM keys, no network.
 * Kept as a thin alias over the ADK-style runtime for L.0 callers/tests.
 */

export type StubTurnResult = AskEasyTurnResult

export function runStubAskEasy(input: {
  tenantId: string
  userId: string
  prompt: string
  propertyId?: string | null
  unitId?: string | null
}): StubTurnResult {
  return runAskEasyStub(input)
}

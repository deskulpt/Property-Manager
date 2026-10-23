import "server-only"
import { planMockToolCalls, synthesizeMockReply } from "@/lib/adk/mock"
import { planGeminiToolCalls, resolveGeminiApiKey, synthesizeGeminiReply } from "@/lib/adk/gemini"
import { executeAdkTool } from "@/lib/adk/tools"
import type { AdkTurnInput, AdkTurnResult, AdkToolCall } from "@/lib/adk/types"

/**
 * In-process ADK-style runner for Easy Rental.
 * Patterns borrowed from deskulpt/adk-okf-grounded-chat:
 * - Prefer local grounding (here: SQLite via tenant-scoped tools)
 * - Offline mock when no Gemini key (Pure OKF analogue)
 * - Optional live model when GEMINI_API_KEY / GOOGLE_GENAI_API_KEY is set
 */

export function adkRuntimeMode(): "mock" | "gemini" {
  return resolveGeminiApiKey() ? "gemini" : "mock"
}

export async function runAdkTurn(input: AdkTurnInput): Promise<AdkTurnResult> {
  const message = input.message.trim()
  if (!message) {
    return {
      reply: "Ask a question about listings, availability, or your portfolio.",
      mode: adkRuntimeMode(),
      scope: input.scope,
      toolCalls: [],
      toolResults: [],
      grounded: false,
    }
  }

  if (input.scope === "landlord" && !input.tenantId) {
    return {
      reply: "Sign in as a landlord admin to use desk tools. Public visitors can use /ask for catalog search only.",
      mode: adkRuntimeMode(),
      scope: input.scope,
      toolCalls: [],
      toolResults: [],
      grounded: false,
    }
  }

  let mode: AdkTurnResult["mode"] = "mock"
  let toolCalls: AdkToolCall[] = []
  let geminiHint: string | undefined

  if (resolveGeminiApiKey()) {
    try {
      const planned = await planGeminiToolCalls({
        message,
        scope: input.scope,
        propertyId: input.propertyId,
      })
      if ("toolCalls" in planned && planned.toolCalls.length > 0) {
        mode = "gemini"
        toolCalls = planned.toolCalls
        geminiHint = planned.replyHint
      } else {
        toolCalls = planMockToolCalls(message, input.scope, input.propertyId)
      }
    } catch {
      toolCalls = planMockToolCalls(message, input.scope, input.propertyId)
    }
  } else {
    toolCalls = planMockToolCalls(message, input.scope, input.propertyId)
  }

  // Security: strip any client-supplied tenantId from tool args; inject session only.
  const safeCalls = toolCalls.map((call) => {
    const args = { ...call.args }
    delete args.tenantId
    if (input.propertyId && call.name !== "applications_summary" && !args.propertyId) {
      // only attach preferred property for summary/availability
      if (call.name === "property_summary" || call.name === "unit_availability") {
        args.propertyId = input.propertyId
      }
    }
    return { ...call, args }
  })

  const toolResults = safeCalls.map((call) =>
    executeAdkTool(call, { scope: input.scope, tenantId: input.tenantId }),
  )

  if (mode === "gemini") {
    const synthesized = await synthesizeGeminiReply({
      message,
      scope: input.scope,
      toolResultsJson: JSON.stringify(toolResults),
    })
    if (synthesized) {
      return {
        reply: synthesized,
        mode,
        scope: input.scope,
        toolCalls: safeCalls,
        toolResults,
        grounded: toolResults.some((r) => r.ok),
      }
    }
    // Gemini synth failed — extractive mock over the same tool results
    const mock = synthesizeMockReply(message, toolResults)
    return {
      reply: geminiHint ? `${mock.reply}\n\n(Model hint discarded after tool ground.)` : mock.reply,
      mode: "mock",
      scope: input.scope,
      toolCalls: safeCalls,
      toolResults,
      grounded: mock.grounded,
    }
  }

  const mock = synthesizeMockReply(message, toolResults)
  return {
    reply: mock.reply,
    mode: "mock",
    scope: input.scope,
    toolCalls: safeCalls,
    toolResults,
    grounded: mock.grounded,
  }
}

/** Heuristic: route Ask Easy prompts that are Q&A (not draft/job) into ADK. */
export function looksLikeGroundedQuestion(prompt: string): boolean {
  const lower = prompt.toLowerCase()
  if (
    /\b(assign|electrician|plumber|courier|cleaning|draft listing|autofill|write copy|propose)\b/.test(
      lower,
    )
  ) {
    return false
  }
  return /\b(what|which|how many|show|list|find|search|where|status|portfolio|overview)\b/.test(
    lower,
  ) || /(availab|vacan|summar|occupanc|application)/.test(lower)
}

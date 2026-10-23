import "server-only"
import { ADK_TOOL_SPECS } from "@/lib/adk/tools"
import type { AdkScope, AdkToolCall, AdkToolName } from "@/lib/adk/types"

/**
 * Optional Gemini path when GEMINI_API_KEY or GOOGLE_GENAI_API_KEY is set.
 * Keys stay server-side only. Failures fall back to mock in the runner.
 */

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

export function resolveGeminiApiKey(): string | null {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENAI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    ""
  if (!key || key === "undefined" || key.length < 20) return null
  return key
}

function declarationsForScope(scope: AdkScope) {
  return ADK_TOOL_SPECS.filter((t) => t.scopes.includes(scope)).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(t.parameters).map(([k, v]) => [k, { type: v.type, description: v.description }]),
      ),
    },
  }))
}

export async function planGeminiToolCalls(input: {
  message: string
  scope: AdkScope
  propertyId?: string | null
  tenantLabel?: string | null
}): Promise<{ toolCalls: AdkToolCall[]; replyHint?: string } | { error: string }> {
  const apiKey = resolveGeminiApiKey()
  if (!apiKey) return { error: "no_key" }

  const system = [
    "You are Ask Easy on Easy Rental, a multi-tenant C&I leasing platform.",
    "Use only the provided function tools. Never invent property ids outside tool results.",
    "tenant_id is injected by the server — do not ask the user for another organisation's id.",
    input.scope === "public"
      ? "Public scope: only search_listings (catalog data)."
      : `Landlord desk for org ${input.tenantLabel ?? "session tenant"}. Prefer property_summary, unit_availability, applications_summary.`,
    input.propertyId ? `Preferred propertyId context: ${input.propertyId}` : "",
  ]
    .filter(Boolean)
    .join(" ")

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: input.message }] }],
    tools: [{ function_declarations: declarationsForScope(input.scope) }],
    tool_config: { function_calling_config: { mode: "ANY" } },
  }

  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    return { error: `gemini_http_${res.status}:${text.slice(0, 200)}` }
  }

  const json = (await res.json()) as {
    candidates?: {
      content?: {
        parts?: {
          text?: string
          functionCall?: { name?: string; args?: Record<string, unknown> }
        }[]
      }
    }[]
  }

  const parts = json.candidates?.[0]?.content?.parts ?? []
  const toolCalls: AdkToolCall[] = []
  let replyHint: string | undefined

  for (const part of parts) {
    if (part.functionCall?.name) {
      const name = part.functionCall.name as AdkToolName
      toolCalls.push({
        name,
        args: {
          ...(part.functionCall.args ?? {}),
          ...(input.propertyId && !part.functionCall.args?.propertyId
            ? { propertyId: input.propertyId }
            : {}),
        },
      })
    } else if (part.text) {
      replyHint = part.text
    }
  }

  if (toolCalls.length === 0) {
    return { error: "gemini_no_tools", ...(replyHint ? { replyHint } as object : {}) } as {
      error: string
    }
  }

  return { toolCalls, replyHint }
}

export async function synthesizeGeminiReply(input: {
  message: string
  toolResultsJson: string
  scope: AdkScope
}): Promise<string | null> {
  const apiKey = resolveGeminiApiKey()
  if (!apiKey) return null

  const prompt = [
    "Write a concise landlord/public assistant reply from these tool JSON results.",
    "Cite only facts present in the JSON. No cross-tenant speculation.",
    `Scope: ${input.scope}`,
    `User: ${input.message}`,
    `Tools: ${input.toolResultsJson.slice(0, 6000)}`,
  ].join("\n")

  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  })
  if (!res.ok) return null
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("")?.trim() || null
}

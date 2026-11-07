import "server-only"
import { toolCatalogForModel } from "@/lib/agentic/tools"
import type { AgentToolName } from "@/lib/agentic/types"

/**
 * AgentModelProvider — stub by default; optional live HTTP / Gemini planner.
 * Any live failure falls back to stub so OSS/demo works offline.
 */

export type ModelProviderId = "stub" | "live"

export type PlannedToolCall = {
  toolName: AgentToolName
  args?: Record<string, unknown>
}

export type ModelPlan = {
  providerId: ModelProviderId
  toolCalls: PlannedToolCall[]
  note: string
}

export type PlanTurnInput = {
  tenantId: string
  prompt: string
  propertyId?: string | null
  unitId?: string | null
  /** Prefer summarize_portfolio for first onboard turn. */
  onboard?: boolean
  /** Country pack ISO — live model gated by realPiiAiConnectorsMedia. */
  countryIso?: string | null
}

const ALL_TOOLS = new Set<AgentToolName>([
  "draft_listing",
  "propose_job_assignment",
  "list_providers_by_trade",
  "list_properties",
  "get_property",
  "list_units",
  "get_unit",
  "get_listing_draft",
  "list_listing_attributes",
  "summarize_portfolio",
  "propose_list_unit",
  "propose_unlist_unit",
  "propose_upsert_occupant_ledger",
  "propose_upsert_lease_party",
  "draft_rental_agreement",
  "propose_esign_send",
  "memory_list",
  "memory_remember",
  "memory_purge",
])

function detectIntent(prompt: string, onboard?: boolean): AgentToolName {
  const lower = prompt.toLowerCase().trim()
  if (!lower || onboard) {
    if (
      !lower ||
      /\b(onboard|get started|hello|hi|help|tour me|what can you|start)\b/.test(lower)
    ) {
      return "summarize_portfolio"
    }
  }


  // L.1 durable memory (list before remember — "what do you remember" is a read)
  if (/\b(purge|erase|forget|delete)\b/.test(lower) && /\b(memory|memories|notes?)\b/.test(lower)) {
    return "memory_purge"
  }
  if (
    /\b(what do you (know|remember)|show (my |the )?memory|list (my |the )?memory|saved notes?|complaint themes?|preferred vendors?)\b/.test(
      lower,
    ) ||
    (/\bmemory\b/.test(lower) && /\b(list|show|view|recall|about)\b/.test(lower))
  ) {
    return "memory_list"
  }
  if (
    /\b(remember|memorise|memorize|save (this|that) note|don't forget|do not forget)\b/.test(lower) ||
    (/\b(preferred vendor|complaint theme|recurring issue|escalation note|tone pref)\b/.test(lower) &&
      /\b(note|save|store|add)\b/.test(lower))
  ) {
    return "memory_remember"
  }

  // Lease onboard intents (never-auto mutators)
  if (
    /(?:^|[^.\w])(esign|e-sign|docusign|digio|emudhra)(?:[^.\w]|$)/i.test(prompt) ||
    /\b(send (the )?(agreement|lease|packet)|e-?sign send|envelope)\b/.test(lower)
  ) {
    return "propose_esign_send"
  }
  if (
    /\b(rental agreement|lease agreement|draft (the )?(lease|agreement)|standard agreement|jurisdiction)\b/.test(
      lower,
    )
  ) {
    return "draft_rental_agreement"
  }
  if (
    /\b(guarantor|secondary (tenant|holder|party)|primary (tenant|holder|party)|lease (party|holder)|add (a )?tenant)\b/.test(
      lower,
    )
  ) {
    return "propose_upsert_lease_party"
  }
  if (
    /\b(occupant|ledger seed|new occupant|update ledger|seed rent)\b/.test(lower)
  ) {
    return "propose_upsert_occupant_ledger"
  }
  if (/\b(unlist|delist|take (off|down)|unpublish)\b/.test(lower)) {
    return "propose_unlist_unit"
  }
  if (/\b(list (the )?(unit|bay)|re-?list|publish (the )?(unit|bay|listing))\b/.test(lower)) {
    return "propose_list_unit"
  }
  if (
    /\b(assign|electrician|plumber|courier|cleaning|concierge|job|repair|fix|worker)\b/.test(
      lower,
    )
  ) {
    return "propose_job_assignment"
  }
  if (/\b(providers?|trades?|who can)\b/.test(lower)) return "list_providers_by_trade"
  if (/\b(draft listing|autofill|write copy|listing copy)\b/.test(lower)) return "draft_listing"
  if (/\b(attribute|schema|what fields|what can you read|catalog of fields)\b/.test(lower)) {
    return "list_listing_attributes"
  }
  if (/\b(listing draft|my draft|unpublished draft)\b/.test(lower)) return "get_listing_draft"
  if (
    /\b(onboard|portfolio|overview|how many|rent.?roll|occupanc|ledger due|open applications?)\b/.test(
      lower,
    )
  ) {
    return "summarize_portfolio"
  }
  if (/\b(list (all )?buildings?|list properties|my buildings|which buildings)\b/.test(lower)) {
    return "list_properties"
  }
  if (/\b(list (all )?(units|bays)|which (units|bays)|unit status|availab)\b/.test(lower)) {
    return "list_units"
  }
  if (
    /\b(unit |bay |sqft|square feet|rate|dock|clear height|power|matterport|amenities|this unit|this bay)\b/.test(
      lower,
    ) ||
    /\b[A-Z]?\d{1,3}[A-Z]?\b/.test(prompt)
  ) {
    // Prefer single-unit detail when a code-like token or amenity ask appears
    if (/\b(building|property|address|floor plan|this property)\b/.test(lower) && !/\b(unit|bay)\b/.test(lower)) {
      return "get_property"
    }
    return "get_unit"
  }
  if (/\b(building|property|address|floor plan|this property)\b/.test(lower)) {
    return "get_property"
  }
  if (/\b(draft|listing)\b/.test(lower)) return "draft_listing"

  // Default desk: powerful onboard summary from real DB rows
  return "summarize_portfolio"
}

/** Deterministic offline planner — no network. */
export function planStubTurn(input: PlanTurnInput): ModelPlan {
  return {
    providerId: "stub",
    toolCalls: [{ toolName: detectIntent(input.prompt, input.onboard) }],
    note: "Stub planner · retrieval from SQLite (no LLM keys).",
  }
}

/**
 * Live HTTP / Gemini planners are opt-in.
 * A key alone must not enable outbound model calls (fail-closed).
 * Set ASK_EASY_LIVE_MODEL=1 to allow live planning when a key is present.
 */
export function liveModelEnabled(): boolean {
  const flag = process.env.ASK_EASY_LIVE_MODEL?.trim()
  return flag === "1" || flag === "true"
}

function liveModelApiKey(): string {
  return (
    process.env.ASK_EASY_MODEL_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENAI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    ""
  )
}

export function liveModelConfigured(): boolean {
  if (!liveModelEnabled()) return false
  const key = liveModelApiKey()
  return Boolean(key && key !== "undefined" && key.length >= 8)
}

/**
 * Minimize PII before any outbound model call (DPDP / D06).
 * Deterministic redaction — not a guarantee against all leakage via tool results.
 */
export function redactPiiForModel(text: string): string {
  let out = text
  out = out.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]")
  // PAN-shaped (ABCDE1234F) before digit sweeps
  out = out.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, "[REDACTED_PAN]")
  // Aadhaar-shaped 12 digits (before generic phone/card sweeps)
  out = out.replace(/(?<!\d)(\d{4}[\s-]?\d{4}[\s-]?\d{4})(?!\d)/g, "[REDACTED_AADHAAR]")
  // Long digit runs that look like cards / account numbers (13–19)
  out = out.replace(/(?<!\d)((?:\d[\s-]?){12,18}\d)(?!\d)/g, (g1: string) => {
    const digits = g1.replace(/\D/g, "")
    if (digits.length >= 13 && digits.length <= 19) return "[REDACTED_CARD]"
    return g1
  })
  // Phones — prefer E.164 / grouped forms; avoid swallowing already-redacted tokens
  out = out.replace(/(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)/g, "[REDACTED_PHONE]")
  return out
}

/** Strip high-risk identifiers from planner args before they leave the process. */
export function minimizePlanTurnForModel(input: PlanTurnInput): {
  prompt: string
  propertyId: string | null
  unitId: string | null
  onboard: boolean
  /** Opaque — never the raw tenant primary key to the provider. */
  tenantRef: "session"
} {
  return {
    prompt: redactPiiForModel(input.prompt),
    propertyId: input.propertyId ?? null,
    unitId: input.unitId ?? null,
    onboard: Boolean(input.onboard),
    tenantRef: "session",
  }
}

function liveModelUrl(): string {
  return (
    process.env.ASK_EASY_MODEL_URL?.trim() ||
    "https://api.openai.com/v1/chat/completions"
  )
}

type LiveChatResponse = {
  choices?: { message?: { content?: string | null } }[]
}

function parseLiveToolName(content: string): AgentToolName | null {
  const trimmed = content.trim()
  try {
    const parsed = JSON.parse(trimmed) as { tool?: string; toolName?: string }
    const name = String(parsed.toolName ?? parsed.tool ?? "").trim() as AgentToolName
    if (ALL_TOOLS.has(name)) return name
  } catch {
    // fall through
  }
  for (const name of ALL_TOOLS) {
    if (trimmed.includes(name)) return name
  }
  return null
}

export async function planLiveTurn(input: PlanTurnInput): Promise<ModelPlan> {
  if (!liveModelEnabled()) throw new Error("Live model disabled (ASK_EASY_LIVE_MODEL≠1)")
  const { assertLiveModelAllowed } = await import("@/lib/markets/enforce")
  const aiGate = assertLiveModelAllowed(input.countryIso ?? "IN")
  if (!aiGate.ok) throw new Error(aiGate.error)
  const apiKey = liveModelApiKey()
  if (!apiKey) throw new Error("No live model API key")

  const minimized = minimizePlanTurnForModel(input)

  // Prefer sibling Gemini planner when using Google keys without ASK_EASY_MODEL_URL
  if (!process.env.ASK_EASY_MODEL_API_KEY?.trim() && !process.env.ASK_EASY_MODEL_URL?.trim()) {
    try {
      const { planGeminiToolCalls } = await import("@/lib/adk/gemini")
      const planned = await planGeminiToolCalls({
        message: minimized.prompt,
        scope: "landlord",
        propertyId: minimized.propertyId,
      })
      if ("toolCalls" in planned && planned.toolCalls.length > 0) {
        // Map ADK tool names → Ask Easy registry when possible
        const mapped = mapAdkToAskEasy(planned.toolCalls[0].name, input)
        return {
          providerId: "live",
          toolCalls: [{ toolName: mapped }],
          note: "Live Gemini planner (PII-minimized).",
        }
      }
    } catch {
      // fall through to chat-completions path / stub
    }
  }

  const catalog = toolCatalogForModel()
  const body = {
    model: process.env.ASK_EASY_MODEL_NAME?.trim() || "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: [
          "You are Ask Easy for Easy Rental (India industrial leasing).",
          'Reply with ONLY JSON: {"tool":"<one tool name>"}.',
          "Prefer read tools for onboarding and attribute questions.",
          "Never invent side effects. Mutating tools only propose; landlord must approve.",
          "Lease onboard order: list/unlist → occupant ledger → parties → draft_rental_agreement → propose_esign_send.",
          "Memory (L.1): memory_list / memory_remember / memory_purge. Never store Aadhaar images or raw Aadhaar numbers.",
          "Inbound user content is PII-minimized; do not request raw Aadhaar, PAN, card, or phone numbers.",
          "Tools:",
          ...catalog.map((t) => `- ${t.name}: ${t.description}`),
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify(minimized),
      },
    ],
  }

  const res = await fetch(liveModelUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) throw new Error(`Live model HTTP ${res.status}`)
  const json = (await res.json()) as LiveChatResponse
  const content = json.choices?.[0]?.message?.content ?? ""
  const toolName = parseLiveToolName(content)
  if (!toolName) throw new Error("Live model returned no usable tool")
  return {
    providerId: "live",
    toolCalls: [{ toolName }],
    note: "Live model planner.",
  }
}

function mapAdkToAskEasy(
  name: string,
  input: PlanTurnInput,
): AgentToolName {
  if (name === "property_summary") {
    return input.propertyId ? "get_property" : "summarize_portfolio"
  }
  if (name === "unit_availability") return "list_units"
  if (name === "applications_summary") return "summarize_portfolio"
  if (name === "search_listings") return "list_units"
  return detectIntent(input.prompt, input.onboard)
}

export async function resolveModelPlan(input: PlanTurnInput): Promise<ModelPlan> {
  if (!liveModelConfigured()) return planStubTurn(input)
  const { assertLiveModelAllowed } = await import("@/lib/markets/enforce")
  const aiGate = assertLiveModelAllowed(input.countryIso ?? "IN")
  if (!aiGate.ok) {
    const stub = planStubTurn(input)
    return {
      ...stub,
      note: "Live model blocked (realPiiAiConnectorsMedia OFF) — stub retrieval only.",
    }
  }
  try {
    return await planLiveTurn(input)
  } catch {
    const stub = planStubTurn(input)
    return { ...stub, note: "Live model unavailable — stub retrieval fallback." }
  }
}

export function resolveModelPlanSync(input: PlanTurnInput): ModelPlan {
  return planStubTurn(input)
}

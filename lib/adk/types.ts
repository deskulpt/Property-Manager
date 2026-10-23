/** ADK-shaped agent types for Easy Rental (in-process TypeScript). */

export type AdkScope = "public" | "landlord"

export type AdkToolName =
  | "search_listings"
  | "property_summary"
  | "unit_availability"
  | "applications_summary"

export type AdkToolCall = {
  name: AdkToolName
  args: Record<string, unknown>
}

export type AdkToolResult = {
  name: AdkToolName
  ok: boolean
  data?: unknown
  error?: string
}

export type AdkMode = "mock" | "gemini"

export type AdkTurnInput = {
  message: string
  scope: AdkScope
  /** Required for landlord desk tools — always from session, never client trust. */
  tenantId?: string | null
  propertyId?: string | null
}

export type AdkTurnResult = {
  reply: string
  mode: AdkMode
  scope: AdkScope
  toolCalls: AdkToolCall[]
  toolResults: AdkToolResult[]
  grounded: boolean
}

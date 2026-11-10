/**
 * Ask Easy / agentic AI policy (Aloke Nov7).
 * Cloudflare AI Gateway + Workers AI + daily neuron limits.
 * Real PII blocked until data-handling review (`realPiiAiConnectorsMedia` OFF).
 */

import { legalFlag } from "@/lib/markets/legal-flags"

export const AI_STACK = {
  gateway: "cloudflare_ai_gateway",
  inference: "cloudflare_workers_ai",
  /** Soft daily neuron budget — enforce in gateway config when live. */
  neuronLimitMode: "daily",
} as const

export type AiPolicy = {
  stack: typeof AI_STACK
  allowRealPii: boolean
  syntheticDemoOnly: boolean
  notes: string
}

export function aiPolicyForIso(iso: string): AiPolicy {
  const allowRealPii = legalFlag(iso, "realPiiAiConnectorsMedia")
  return {
    stack: AI_STACK,
    allowRealPii,
    syntheticDemoOnly: !allowRealPii,
    notes: allowRealPii
      ? "Real PII allowed after data-handling review."
      : "Real PII blocked — synthetic demo only; Cloudflare AI Gateway + Workers AI + daily neuron limits.",
  }
}

/** Fail-closed gate before sending user content to any model. */
export function assertAiPiiAllowed(iso: string): { ok: true } | { ok: false; error: string } {
  if (legalFlag(iso, "realPiiAiConnectorsMedia")) return { ok: true }
  return {
    ok: false,
    error: "Real PII blocked for AI connectors/media until data-handling review (flag OFF).",
  }
}

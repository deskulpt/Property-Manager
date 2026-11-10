/**
 * D09 dual-control helpers — no self-approval for never-auto tools;
 * tamper-evident proposal binding hash for audit stubs.
 */
import { createHash, createHmac } from "node:crypto"
import type { AgentProposal } from "@/lib/agentic/types"
import { isNeverAuto } from "@/lib/mcp/policy"

/** Stable digest of the proposal identity + payload (content binding). */
export function proposalContentDigest(proposal: AgentProposal): string {
  const canonical = JSON.stringify({
    id: proposal.id,
    tenantId: proposal.tenantId,
    toolName: proposal.toolName,
    createdBy: proposal.createdBy,
    createdAt: proposal.createdAt,
    payload: proposal.payload,
    promptSummary: proposal.promptSummary,
  })
  return createHash("sha256").update(canonical).digest("hex")
}

/**
 * HMAC binding when DESKULPT_SECRET_KEY is set; otherwise content digest only.
 * Audit consumers should treat missing HMAC as stub-strength (not KMS-backed).
 */
export function proposalBindingHash(proposal: AgentProposal): string {
  const digest = proposalContentDigest(proposal)
  const key = process.env.DESKULPT_SECRET_KEY?.trim()
  if (key && key.length >= 16) {
    return createHmac("sha256", key).update(`v1:proposal-bind:${digest}`).digest("hex")
  }
  return `sha256:${digest}`
}

export type DualControlCheck =
  | { ok: true; bindingHash: string }
  | { ok: false; error: string; code: "self_approval" }

/**
 * Never-auto tools require a distinct human approver (requester ≠ approver).
 * Soft drafts / non-never-auto may still self-approve.
 */
export function assertDistinctApprover(
  proposal: AgentProposal,
  actorUserId: string,
): DualControlCheck {
  const bindingHash = proposalBindingHash(proposal)
  if (!isNeverAuto(proposal.toolName)) {
    return { ok: true, bindingHash }
  }
  if (proposal.createdBy && proposal.createdBy === actorUserId) {
    return {
      ok: false,
      code: "self_approval",
      error:
        "Self-approval blocked for never-auto tools (D09 dual-control). A distinct approver is required.",
    }
  }
  return { ok: true, bindingHash }
}

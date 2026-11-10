/**
 * D09 dual-control — distinct approvers, request binding, expiry / replay / race,
 * CFO CAD thresholds, books-exportable audit.
 */
import { createHash, createHmac } from "node:crypto"
import type { AgentProposal } from "@/lib/agentic/types"
import {
  approverDailyHeadroomCadCents,
  DUAL_CONTROL_APPROVER_DAILY_CAP_CAD_CENTS,
  DUAL_CONTROL_FINANCE_POLICY_VERSION,
  DUAL_CONTROL_REFUND_THRESHOLD_CAD_CENTS,
  requiresDualControl,
  type DualControlAction,
} from "@/lib/billing/dual-control"
import { isNeverAuto, neverAutoClassFor } from "@/lib/mcp/policy"

/** Default proposal TTL for never-auto (24h). Override with EASYRENTAL_PROPOSAL_TTL_HOURS. */
export function proposalTtlHours(): number {
  const raw = process.env.EASYRENTAL_PROPOSAL_TTL_HOURS?.trim()
  const n = raw ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 1 && n <= 24 * 30) return Math.floor(n)
  return 24
}

export function proposalExpiresAtIso(createdAtIso: string, toolName: string): string | null {
  if (!isNeverAuto(toolName)) return null
  const created = Date.parse(createdAtIso)
  if (!Number.isFinite(created)) return null
  return new Date(created + proposalTtlHours() * 3_600_000).toISOString()
}

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

export type DualControlFailCode =
  | "self_approval"
  | "expired"
  | "binding_mismatch"
  | "replay"
  | "daily_cap"

export type DualControlCheck =
  | {
      ok: true
      bindingHash: string
      amountCadCents: number | null
      financeRequired: boolean
      financePolicyVersion: typeof DUAL_CONTROL_FINANCE_POLICY_VERSION
    }
  | { ok: false; error: string; code: DualControlFailCode; bindingHash: string }

/** Extract CAD-cents amount from known money payloads (seedRentCents etc.). */
export function amountCadCentsFromProposal(proposal: AgentProposal): number | null {
  const payload = proposal.payload as Record<string, unknown>
  const candidates = [payload.seedRentCents, payload.amountCadCents, payload.amountCents]
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c >= 0) return Math.floor(c)
  }
  return proposal.amountCadCents ?? null
}

function financeActionForTool(toolName: string): DualControlAction {
  const cls = neverAutoClassFor(toolName)
  if (cls === "export") return "privileged_export"
  if (toolName.includes("refund")) return "large_refund"
  if (toolName.includes("deposit")) return "deposit_release"
  if (toolName.includes("payout")) return "payout"
  if (cls === "money") return "other_money"
  return "other_money"
}

/**
 * Never-auto tools require a distinct human approver (requester ≠ approver).
 * Soft drafts / non-never-auto may still self-approve.
 * Also enforces expiry, optional binding match (replay), and CAD daily cap.
 */
export function assertDualControlApprove(
  proposal: AgentProposal,
  actorUserId: string,
  opts?: {
    expectedBindingHash?: string | null
    alreadyApprovedCadCentsToday?: number
    nowIso?: string
  },
): DualControlCheck {
  const bindingHash = proposalBindingHash(proposal)
  const amountCadCents = amountCadCentsFromProposal(proposal)
  const finance = requiresDualControl({
    action: financeActionForTool(proposal.toolName),
    amountCadCents,
  })

  if (proposal.status !== "pending") {
    return {
      ok: false,
      code: "replay",
      bindingHash,
      error: `Replay blocked: proposal status is ${proposal.status}, not pending.`,
    }
  }

  const now = Date.parse(opts?.nowIso ?? new Date().toISOString())
  const expiresAt = proposal.expiresAt ?? proposalExpiresAtIso(proposal.createdAt, proposal.toolName)
  if (expiresAt && Date.parse(expiresAt) <= now) {
    return {
      ok: false,
      code: "expired",
      bindingHash,
      error: `Proposal expired at ${expiresAt} (D09 expiry). Re-propose to continue.`,
    }
  }

  if (opts?.expectedBindingHash != null && opts.expectedBindingHash !== "") {
    if (opts.expectedBindingHash !== bindingHash) {
      return {
        ok: false,
        code: "binding_mismatch",
        bindingHash,
        error:
          "Request binding mismatch — proposal payload changed since the approval view (D09).",
      }
    }
  }

  // Never-auto OR Finance-threshold money → distinct approver.
  const needsDistinct =
    isNeverAuto(proposal.toolName) ||
    finance.required ||
    (amountCadCents != null && amountCadCents > DUAL_CONTROL_REFUND_THRESHOLD_CAD_CENTS)

  if (needsDistinct) {
    if (!proposal.createdBy || !actorUserId) {
      return {
        ok: false,
        code: "self_approval",
        bindingHash,
        error: "Authenticated distinct approver required (D09 dual-control).",
      }
    }
    if (proposal.createdBy === actorUserId) {
      return {
        ok: false,
        code: "self_approval",
        bindingHash,
        error:
          "Self-approval blocked for dual-control actions (D09). A distinct approver is required.",
      }
    }
  }

  if (amountCadCents != null && amountCadCents > 0 && needsDistinct) {
    const already = opts?.alreadyApprovedCadCentsToday ?? 0
    const headroom = approverDailyHeadroomCadCents({ alreadyApprovedCadCentsToday: already })
    if (amountCadCents > headroom) {
      return {
        ok: false,
        code: "daily_cap",
        bindingHash,
        error: `Approver daily CAD cap exceeded (cap ${DUAL_CONTROL_APPROVER_DAILY_CAP_CAD_CENTS} cents; headroom ${headroom}; request ${amountCadCents}).`,
      }
    }
  }

  return {
    ok: true,
    bindingHash,
    amountCadCents,
    financeRequired: needsDistinct,
    financePolicyVersion: DUAL_CONTROL_FINANCE_POLICY_VERSION,
  }
}

/** @deprecated Prefer assertDualControlApprove — kept for #46 test compatibility. */
export function assertDistinctApprover(
  proposal: AgentProposal,
  actorUserId: string,
): DualControlCheck {
  return assertDualControlApprove(proposal, actorUserId)
}

/** CSV header + rows for books-exportable dual-control audit. */
export function dualControlAuditCsvHeader(): string {
  return [
    "audit_id",
    "tenant_id",
    "proposal_id",
    "tool_name",
    "created_by",
    "decided_by",
    "decided_at",
    "binding_hash",
    "amount_cad_cents",
    "decision",
    "finance_policy_version",
  ].join(",")
}

export function dualControlAuditCsvRow(input: {
  auditId: string
  tenantId: string
  proposalId: string
  toolName: string
  createdBy: string
  decidedBy: string
  decidedAt: string
  bindingHash: string
  amountCadCents: number | null
  decision: "approved" | "rejected" | "failed"
}): string {
  const cells = [
    input.auditId,
    input.tenantId,
    input.proposalId,
    input.toolName,
    input.createdBy,
    input.decidedBy,
    input.decidedAt,
    input.bindingHash,
    input.amountCadCents == null ? "" : String(input.amountCadCents),
    input.decision,
    DUAL_CONTROL_FINANCE_POLICY_VERSION,
  ]
  return cells.map(csvEscape).join(",")
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export {
  DUAL_CONTROL_APPROVER_DAILY_CAP_CAD_CENTS,
  DUAL_CONTROL_FINANCE_POLICY_VERSION,
  DUAL_CONTROL_REFUND_THRESHOLD_CAD_CENTS,
}

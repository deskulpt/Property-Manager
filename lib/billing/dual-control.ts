/**
 * Dual-control threshold stubs (CFO D09 — DEMO/STUB).
 *
 * Eng/Security currently REJECTS production dual-control (see decisions register).
 * This module scaffolds dollar threshold, self-approval block, and books-exportable
 * audit shape — it does NOT claim tamper-resistant audit or race-safe approval.
 */

export type DualControlAction =
  | "payout"
  | "large_refund"
  | "privileged_export"
  | "legal_notice"
  | "other_money"

/** Default threshold in USD cents — amounts at/above require dual control. */
export const DUAL_CONTROL_THRESHOLD_USD_CENTS = 50_000 // $500 demo default

export type DualControlDecision = {
  required: boolean
  reason: string
  thresholdUsdCents: number
  amountUsdCents: number | null
  labelledDemo: true
  /** Eng Reject open — do not treat as production-ready */
  productionReady: false
}

export function requiresDualControl(input: {
  action: DualControlAction
  amountUsdCents?: number | null
  thresholdUsdCents?: number
}): DualControlDecision {
  const threshold = input.thresholdUsdCents ?? DUAL_CONTROL_THRESHOLD_USD_CENTS
  const amount = input.amountUsdCents ?? null

  if (
    input.action === "privileged_export" ||
    input.action === "legal_notice" ||
    input.action === "payout"
  ) {
    return {
      required: true,
      reason: `Action ${input.action} always dual-control (policy)`,
      thresholdUsdCents: threshold,
      amountUsdCents: amount,
      labelledDemo: true,
      productionReady: false,
    }
  }

  if (amount != null && amount >= threshold) {
    return {
      required: true,
      reason: `Amount ${amount} ≥ threshold ${threshold} USD cents`,
      thresholdUsdCents: threshold,
      amountUsdCents: amount,
      labelledDemo: true,
      productionReady: false,
    }
  }

  return {
    required: false,
    reason: "Below threshold — requesting-human confirmation OK (when dual-control not otherwise required)",
    thresholdUsdCents: threshold,
    amountUsdCents: amount,
    labelledDemo: true,
    productionReady: false,
  }
}

/** Block self-approval: requester must differ from approver. */
export function assertDistinctApprover(input: {
  requesterUserId: string
  approverUserId: string
}): { ok: true } | { ok: false; error: "self_approval_blocked" } {
  if (!input.requesterUserId || !input.approverUserId) {
    return { ok: false, error: "self_approval_blocked" }
  }
  if (input.requesterUserId === input.approverUserId) {
    return { ok: false, error: "self_approval_blocked" }
  }
  return { ok: true }
}

/** Books-exportable audit row shape (stub — not a durable store). */
export type DualControlAuditRow = {
  id: string
  action: DualControlAction
  amountUsdCents: number | null
  requesterUserId: string
  approverUserId: string
  decidedAtIso: string
  decision: "approved" | "rejected"
  /** Stable IDs for books export */
  exportable: true
}

export function buildDualControlAuditRow(
  input: Omit<DualControlAuditRow, "exportable">,
): DualControlAuditRow {
  return { ...input, exportable: true }
}

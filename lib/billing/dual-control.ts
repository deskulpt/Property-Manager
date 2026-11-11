/**
 * Dual-control (D09) — Aloke Nov10 locked Finance thresholds.
 *
 * Policy (Aloke locked 2026-11-10):
 * - Refunds > CAD 500 OR > 1 month of subscription → dual control
 * - Every payout / deposit release → two people
 * - No self-approval
 * - CAD 2,000 / day / approver cap (non-weakenable)
 * - Books-exportable audit log
 *
 * Eng race/binding/expiry/distinct controls ship in `lib/mcp/dual-control.ts`.
 * Append-only tamper-resistant ledger strengthening is owned by sibling
 * CTO Eng priority fixes — stack, do not duplicate WORM here.
 *
 * Live money rails remain OFF (synthetic demo). Deposit holding hard OFF.
 */

import {
  ALOKE_APPROVER_DAILY_CAP_CAD_CENTS,
  ALOKE_NOV10_LOCKS_VERSION,
  ALOKE_REFUND_DUAL_CONTROL_CAD_CENTS,
} from "@/lib/billing/aloke-nov10-locks"

export type DualControlAction =
  | "payout"
  | "large_refund"
  | "deposit_release"
  | "privileged_export"
  | "legal_notice"
  | "other_money"

/** Aloke Nov10 lock: refunds above CAD 500 (cents). Non-weakenable. */
export const DUAL_CONTROL_REFUND_THRESHOLD_CAD_CENTS = ALOKE_REFUND_DUAL_CONTROL_CAD_CENTS

/** Aloke Nov10 lock: per-approver daily cap CAD 2,000 (cents). Non-weakenable. */
export const DUAL_CONTROL_APPROVER_DAILY_CAP_CAD_CENTS = ALOKE_APPROVER_DAILY_CAP_CAD_CENTS

export const DUAL_CONTROL_FINANCE_POLICY_VERSION = ALOKE_NOV10_LOCKS_VERSION

export type DualControlDecision = {
  required: boolean
  reason: string
  thresholdCadCents: number
  amountCadCents: number | null
  labelledDemo: true
  /**
   * Eng dual-control machinery (distinct / binding / expiry / race) is ready
   * for demo + fail-closed policy. Live money still OFF.
   */
  engControlsReady: true
  /** Live money / WORM ledger — false until sibling CTO append-only + go-live evidence. */
  productionReady: false
  liveMoneyReady: false
  financePolicyVersion: typeof DUAL_CONTROL_FINANCE_POLICY_VERSION
  alokeThresholdsLocked: true
}

function lockedThreshold(requested?: number): number {
  // Never allow a higher (weaker) threshold than Aloke lock.
  if (requested == null || !Number.isFinite(requested)) {
    return DUAL_CONTROL_REFUND_THRESHOLD_CAD_CENTS
  }
  return Math.min(Math.floor(requested), DUAL_CONTROL_REFUND_THRESHOLD_CAD_CENTS)
}

export function requiresDualControl(input: {
  action: DualControlAction
  /** Refund / money amount in CAD cents */
  amountCadCents?: number | null
  /** One month of subscription fee in CAD cents (for “> 1 mo sub” rule) */
  oneMonthSubscriptionCadCents?: number | null
  /** May only tighten (lower) the Aloke-locked CAD 500 threshold. */
  thresholdCadCents?: number
}): DualControlDecision {
  const threshold = lockedThreshold(input.thresholdCadCents)
  const amount = input.amountCadCents ?? null
  const oneMo = input.oneMonthSubscriptionCadCents ?? null

  const base = {
    thresholdCadCents: threshold,
    amountCadCents: amount,
    labelledDemo: true as const,
    engControlsReady: true as const,
    productionReady: false as const,
    liveMoneyReady: false as const,
    financePolicyVersion: DUAL_CONTROL_FINANCE_POLICY_VERSION,
    alokeThresholdsLocked: true as const,
  }

  if (
    input.action === "payout" ||
    input.action === "deposit_release" ||
    input.action === "privileged_export" ||
    input.action === "legal_notice"
  ) {
    return {
      required: true,
      reason: `Action ${input.action} always dual-control (Finance D09 / Aloke Nov10)`,
      ...base,
    }
  }

  if (input.action === "large_refund" || input.action === "other_money") {
    if (amount != null && amount > threshold) {
      return {
        required: true,
        reason: `Amount ${amount} CAD cents > threshold ${threshold} (Aloke Nov10 lock)`,
        ...base,
      }
    }
    if (amount != null && oneMo != null && oneMo > 0 && amount > oneMo) {
      return {
        required: true,
        reason: `Amount ${amount} > one month subscription ${oneMo} CAD cents (Aloke Nov10)`,
        ...base,
      }
    }
  }

  return {
    required: false,
    reason: "Below Aloke-locked Finance dual-control thresholds",
    ...base,
  }
}

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

/** Remaining headroom under CAD 2k/day/approver (Aloke Nov10 lock). */
export function approverDailyHeadroomCadCents(input: {
  alreadyApprovedCadCentsToday: number
}): number {
  return Math.max(
    0,
    DUAL_CONTROL_APPROVER_DAILY_CAP_CAD_CENTS - Math.max(0, input.alreadyApprovedCadCentsToday),
  )
}

export type DualControlAuditRow = {
  id: string
  action: DualControlAction
  amountCadCents: number | null
  requesterUserId: string
  approverUserId: string
  decidedAtIso: string
  decision: "approved" | "rejected"
  exportable: true
  financePolicyVersion: typeof DUAL_CONTROL_FINANCE_POLICY_VERSION
}

export function buildDualControlAuditRow(
  input: Omit<DualControlAuditRow, "exportable" | "financePolicyVersion">,
): DualControlAuditRow {
  return {
    ...input,
    exportable: true,
    financePolicyVersion: DUAL_CONTROL_FINANCE_POLICY_VERSION,
  }
}

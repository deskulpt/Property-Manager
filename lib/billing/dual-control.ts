/**
 * Dual-control stubs (D09 — Finance APPROVE 7 Nov; Eng still REJECT production).
 *
 * Finance policy:
 * - Refunds > CAD 500 OR > 1 month of subscription → dual control
 * - Every payout / deposit release → two people
 * - No self-approval
 * - CAD 2,000 / day / approver cap
 * - Books-exportable audit log
 *
 * Eng Reject: not tamper-resistant / race-safe yet — productionReady stays false.
 * Live money rails remain OFF (synthetic demo). These thresholds gate
 * approval policy even when amounts are simulated.
 */

export type DualControlAction =
  | "payout"
  | "large_refund"
  | "deposit_release"
  | "privileged_export"
  | "legal_notice"
  | "other_money"

/** Finance: refunds above CAD 500 (cents). */
export const DUAL_CONTROL_REFUND_THRESHOLD_CAD_CENTS = 50_000

/** Finance: per-approver daily cap CAD 2,000 (cents). */
export const DUAL_CONTROL_APPROVER_DAILY_CAP_CAD_CENTS = 200_000

export const DUAL_CONTROL_FINANCE_POLICY_VERSION = "2026-11-07" as const

export type DualControlDecision = {
  required: boolean
  reason: string
  thresholdCadCents: number
  amountCadCents: number | null
  labelledDemo: true
  /** Eng Reject open — Finance Approve does not make this production-ready */
  productionReady: false
  financePolicyVersion: typeof DUAL_CONTROL_FINANCE_POLICY_VERSION
}

export function requiresDualControl(input: {
  action: DualControlAction
  /** Refund / money amount in CAD cents */
  amountCadCents?: number | null
  /** One month of subscription fee in CAD cents (for “> 1 mo sub” rule) */
  oneMonthSubscriptionCadCents?: number | null
  thresholdCadCents?: number
}): DualControlDecision {
  const threshold = input.thresholdCadCents ?? DUAL_CONTROL_REFUND_THRESHOLD_CAD_CENTS
  const amount = input.amountCadCents ?? null
  const oneMo = input.oneMonthSubscriptionCadCents ?? null

  if (
    input.action === "payout" ||
    input.action === "deposit_release" ||
    input.action === "privileged_export" ||
    input.action === "legal_notice"
  ) {
    return {
      required: true,
      reason: `Action ${input.action} always dual-control (Finance D09)`,
      thresholdCadCents: threshold,
      amountCadCents: amount,
      labelledDemo: true,
      productionReady: false,
      financePolicyVersion: DUAL_CONTROL_FINANCE_POLICY_VERSION,
    }
  }

  if (input.action === "large_refund" || input.action === "other_money") {
    if (amount != null && amount > threshold) {
      return {
        required: true,
        reason: `Amount ${amount} CAD cents > threshold ${threshold}`,
        thresholdCadCents: threshold,
        amountCadCents: amount,
        labelledDemo: true,
        productionReady: false,
        financePolicyVersion: DUAL_CONTROL_FINANCE_POLICY_VERSION,
      }
    }
    if (amount != null && oneMo != null && oneMo > 0 && amount > oneMo) {
      return {
        required: true,
        reason: `Amount ${amount} > one month subscription ${oneMo} CAD cents`,
        thresholdCadCents: threshold,
        amountCadCents: amount,
        labelledDemo: true,
        productionReady: false,
        financePolicyVersion: DUAL_CONTROL_FINANCE_POLICY_VERSION,
      }
    }
  }

  return {
    required: false,
    reason: "Below Finance dual-control thresholds",
    thresholdCadCents: threshold,
    amountCadCents: amount,
    labelledDemo: true,
    productionReady: false,
    financePolicyVersion: DUAL_CONTROL_FINANCE_POLICY_VERSION,
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

/** Remaining headroom under CAD 2k/day/approver (stub). */
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
}

export function buildDualControlAuditRow(
  input: Omit<DualControlAuditRow, "exportable">,
): DualControlAuditRow {
  return { ...input, exportable: true }
}

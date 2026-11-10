/**
 * Affiliate terms — DOCUMENTED ONLY, not active (D12 — NOT Aloke-approved).
 * Eng: disable real reward accrual until activation gates close.
 */

export const AFFILIATE_PROGRAM_ACTIVE = false

export const AFFILIATE_DOCUMENTED_TERMS = {
  durationCapMonths: 12,
  /** Pay on collected net after refunds */
  payOn: "collected_net_after_refunds" as const,
  clawbackWindowDays: 90,
  /** Canadian operator: contractor classification + GST/HST + TDS/FEMA review required */
  taxNotes: ["contractor_or_employee_classification", "gst_hst", "tds", "fema_if_cross_border"],
  proposedShareBps: 2000, // 20% — proposal only
  labelledDemo: true as const,
  active: false as const,
}

export function affiliateAccrualAllowed(): false {
  return false
}

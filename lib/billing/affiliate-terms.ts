/**
 * Affiliate terms — DOCUMENTED ONLY until LEGAL_FEATURE_FLAGS.affiliate ON (D12).
 * Eng: reward accrual is gated by affiliateAccrualAllowed() at insertReward sites.
 */

import { legalFlag } from "@/lib/markets/legal-flags"

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

/**
 * Fail-closed: true only when CountryPack / override sets `affiliate` ON.
 * Refer & Earn ledger inserts must call this before accrual.
 */
export function affiliateAccrualAllowed(iso = "CA"): boolean {
  if (AFFILIATE_PROGRAM_ACTIVE) return legalFlag(iso, "affiliate")
  return legalFlag(iso, "affiliate") === true
}

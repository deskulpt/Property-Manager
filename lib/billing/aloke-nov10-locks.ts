/**
 * Aloke Nov10 product locks (2026-11-10) — dual-control / launch alignment.
 *
 * D10 AwC: per-feature release evidence; **no global go-live**.
 * Launch: landlord subscriptions only (rent rails OFF); ON residential +
 * commercial (commercial flag OFF until counsel); direct listings only;
 * deposit-holding **hard OFF**; refund dual-control >CAD500 or >1mo /
 * CAD2k/day; landlord-paid % fee capped; counsel after demo.
 *
 * Sibling [CTO Eng priority fixes] owns edge-block MCP, append-only WORM,
 * affiliate Refer&Earn gate, webhook go-live check, second approver for
 * non-money legal flags, SQLite RPO/Postgres, gated tax adapters — stack,
 * do not duplicate those here.
 */

export const ALOKE_NOV10_LOCKS_VERSION = "2026-11-10" as const

/** Aloke-locked Finance D09 refund threshold (CAD 500). */
export const ALOKE_REFUND_DUAL_CONTROL_CAD_CENTS = 50_000 as const

/** Aloke-locked Finance D09 per-approver daily cap (CAD 2,000). */
export const ALOKE_APPROVER_DAILY_CAP_CAD_CENTS = 200_000 as const

export const ALOKE_NOV10_LOCKS = {
  version: ALOKE_NOV10_LOCKS_VERSION,
  /** D10 — per-feature evidence only; never a single console “go live”. */
  globalGoLive: false as const,
  /** Landlord SaaS subscriptions only at launch. */
  landlordSubscriptionsAtLaunch: true as const,
  /** Rent collection rails OFF at launch (Connect demo builders stay design-only). */
  rentCollectAtLaunch: false as const,
  /** Platform deposit holding — hard OFF (not a soft toggle). */
  depositHolding: false as const,
  depositHoldingHardOff: true as const,
  /** Commercial listings flag stays OFF until counsel (ON residential primary). */
  commercialFlag: false as const,
  /** Landlord-paid % fee model (tenant card fees remain hard OFF). */
  feePayer: "landlord_paid_percent" as const,
  landlordPaidPercentCapped: true as const,
  /** Refund dual-control — Aloke locked Finance thresholds. */
  refundDualControl: {
    thresholdCadCents: ALOKE_REFUND_DUAL_CONTROL_CAD_CENTS,
    alsoAboveOneMonthSubscription: true as const,
    approverDailyCapCadCents: ALOKE_APPROVER_DAILY_CAP_CAD_CENTS,
    alokeLocked: true as const,
  },
  labelledDemo: true as const,
} as const

/** Fail-closed: deposit holding must never enable under Nov10 locks. */
export function assertDepositHoldingHardOff(enabled: boolean): {
  ok: true
} | { ok: false; code: "deposit_holding_hard_off"; error: string } {
  if (enabled) {
    return {
      ok: false,
      code: "deposit_holding_hard_off",
      error:
        "Deposit holding is hard OFF (Aloke Nov10). Counsel + code release required — not a console toggle.",
    }
  }
  return { ok: true }
}

/** Fail-closed: rent collection at launch stays OFF. */
export function assertRentCollectAtLaunchOff(enabled: boolean): {
  ok: true
} | { ok: false; code: "rent_collect_launch_off"; error: string } {
  if (enabled) {
    return {
      ok: false,
      code: "rent_collect_launch_off",
      error:
        "Rent collection is OFF at launch (Aloke Nov10). Landlord subscriptions only until per-feature evidence.",
    }
  }
  return { ok: true }
}

/** Fail-closed: no global go-live switch. */
export function assertNoGlobalGoLive(globalGoLiveRequested: boolean): {
  ok: true
} | { ok: false; code: "no_global_go_live"; error: string } {
  if (globalGoLiveRequested) {
    return {
      ok: false,
      code: "no_global_go_live",
      error: "No global go-live (Aloke Nov10 / D10). Per-feature release evidence only.",
    }
  }
  return { ok: true }
}

/**
 * Per-feature evidence gates — no global go-live master switch (Aloke Nov10 / D10).
 *
 * Each live surface checks the evidence it needs. `evaluateGoLiveGate` remains a
 * roll-up for consoles / docs; checkout and webhooks call `featureGate()`.
 * Rent collection + deposit holding stay product-locked via aloke-nov10-locks
 * (sibling Eng D07/D09) — this module does not re-implement those locks.
 */

import {
  ALOKE_NOV10_LOCKS,
  assertDepositHoldingHardOff,
  assertRentCollectAtLaunchOff,
} from "@/lib/billing/aloke-nov10-locks"

export type GoLiveCheckId =
  | "live_tax_rates"
  | "signed_stripe_agreement"
  | "kyc_vendor_dpa"
  | "test_invoice_tax_lines"
  | "no_route_splits_confirmed"
  | "deposits_not_held_confirmed"

export type FeatureGateId =
  | "subscription_checkout"
  | "billing_webhook_settle"
  | "live_invoice_tax"
  | "rent_collection"
  | "deposit_holding"

export type GoLiveCheck = {
  id: GoLiveCheckId
  label: string
  satisfied: boolean
  evidenceNote: string
}

export type GoLiveGateResult = {
  checks: GoLiveCheck[]
  /** Aggregate only — do not use as a single product switch. Prefer featureGate(). */
  readyForLiveMoney: boolean
  blockers: string[]
  labelledDemo: true
  /** Explicit: there is no one env that flips all money live. */
  globalGoLiveSwitch: false
}

export type FeatureGateResult = {
  feature: FeatureGateId
  allowed: boolean
  requiredChecks: GoLiveCheckId[]
  blockers: string[]
  labelledDemo: true
}

function envFlag(name: string): boolean {
  return process.env[name] === "1"
}

/**
 * Evaluate evidence checklist. Defaults fail-closed.
 * Ops flags: TAX_LIVE_RATES, STRIPE_AGREEMENT_SIGNED, KYC_DPA_SIGNED,
 * TEST_INVOICE_TAX_OK, NO_ROUTE_CONFIRMED, DEPOSITS_NOT_HELD_CONFIRMED.
 */
export function evaluateGoLiveGate(
  overrides?: Partial<Record<GoLiveCheckId, boolean>>,
): GoLiveGateResult {
  const checks: GoLiveCheck[] = [
    {
      id: "live_tax_rates",
      label: "Live Stripe Tax rates verified (ON HST + IN RC)",
      satisfied: overrides?.live_tax_rates ?? envFlag("TAX_LIVE_RATES"),
      evidenceNote: "Stripe Tax enabled; Ontario HST + India reverse-charge with GSTIN",
    },
    {
      id: "signed_stripe_agreement",
      label: "Stripe agreement on file (processor; Deskulpt remits)",
      satisfied: overrides?.signed_stripe_agreement ?? envFlag("STRIPE_AGREEMENT_SIGNED"),
      evidenceNote: "Stripe = processor not MoR; Deskulpt files/remits tax",
    },
    {
      id: "kyc_vendor_dpa",
      label: "KYC vendor DPA signed",
      satisfied: overrides?.kyc_vendor_dpa ?? envFlag("KYC_DPA_SIGNED"),
      evidenceNote: "Processor / KYC DPA before live identity",
    },
    {
      id: "test_invoice_tax_lines",
      label: "Test Stripe invoice with correct tax lines",
      satisfied: overrides?.test_invoice_tax_lines ?? envFlag("TEST_INVOICE_TAX_OK"),
      evidenceNote: "HST / reverse-charge lines correct on test invoice",
    },
    {
      id: "no_route_splits_confirmed",
      label: "Route splits remain OFF (or 3 gates + Legal passed)",
      satisfied: overrides?.no_route_splits_confirmed ?? envFlag("NO_ROUTE_CONFIRMED"),
      evidenceNote:
        "Aloke: Route OFF until Indian entity exists + Razorpay written acceptance + Legal sign-off; Stripe=CA subscriptions",
    },
    {
      id: "deposits_not_held_confirmed",
      label: "Deposit holds remain OFF (product policy hard OFF)",
      satisfied: overrides?.deposits_not_held_confirmed ?? envFlag("DEPOSITS_NOT_HELD_CONFIRMED"),
      evidenceNote:
        "Deposit holding is product-policy hard OFF — landlord/licensed escrow only; flag cannot enable Deskulpt holds",
    },
  ]

  const blockers = checks.filter((c) => !c.satisfied).map((c) => c.label)
  return {
    checks,
    readyForLiveMoney: blockers.length === 0,
    blockers,
    labelledDemo: true,
    globalGoLiveSwitch: false,
  }
}

/** Evidence ids each live surface must satisfy (independent — no global flip). */
export const FEATURE_GATE_REQUIREMENTS: Record<FeatureGateId, readonly GoLiveCheckId[]> = {
  subscription_checkout: [
    "live_tax_rates",
    "signed_stripe_agreement",
    "kyc_vendor_dpa",
    "test_invoice_tax_lines",
    "no_route_splits_confirmed",
  ],
  billing_webhook_settle: [
    "live_tax_rates",
    "signed_stripe_agreement",
    "test_invoice_tax_lines",
    "no_route_splits_confirmed",
  ],
  live_invoice_tax: ["live_tax_rates", "test_invoice_tax_lines", "signed_stripe_agreement"],
  rent_collection: [
    "signed_stripe_agreement",
    "kyc_vendor_dpa",
    "no_route_splits_confirmed",
    "deposits_not_held_confirmed",
  ],
  deposit_holding: ["deposits_not_held_confirmed"],
}

/**
 * Per-feature evidence gate. Prefer this over readyForLiveMoney.
 * Rent / deposit use sibling Aloke Nov10 locks (not env-openable).
 */
export function featureGate(
  feature: FeatureGateId,
  overrides?: Partial<Record<GoLiveCheckId, boolean>>,
): FeatureGateResult {
  if (feature === "rent_collection") {
    const lock = assertRentCollectAtLaunchOff(ALOKE_NOV10_LOCKS.rentCollectAtLaunch)
    return {
      feature,
      allowed: false,
      requiredChecks: [...FEATURE_GATE_REQUIREMENTS.rent_collection],
      blockers: [lock.ok ? "Rent collection OFF at launch" : lock.error],
      labelledDemo: true,
    }
  }
  if (feature === "deposit_holding") {
    const lock = assertDepositHoldingHardOff(ALOKE_NOV10_LOCKS.depositHolding)
    return {
      feature,
      allowed: false,
      requiredChecks: [...FEATURE_GATE_REQUIREMENTS.deposit_holding],
      blockers: [lock.ok ? "Deposit holding hard OFF" : lock.error],
      labelledDemo: true,
    }
  }

  const gate = evaluateGoLiveGate(overrides)
  const required = FEATURE_GATE_REQUIREMENTS[feature]
  const missing = gate.checks.filter((c) => required.includes(c.id) && !c.satisfied)
  return {
    feature,
    allowed: missing.length === 0,
    requiredChecks: [...required],
    blockers: missing.map((c) => c.label),
    labelledDemo: true,
  }
}

export function assertLiveMoneyAllowed():
  | { ok: true }
  | { ok: false; blockers: string[] } {
  const gate = featureGate("subscription_checkout")
  if (!gate.allowed) return { ok: false, blockers: gate.blockers }
  return { ok: true }
}

/** Rent rails — always fail-closed at launch (delegates to Aloke Nov10 locks). */
export function assertRentCollectionAllowed():
  | { ok: true }
  | { ok: false; blockers: string[] } {
  const gate = featureGate("rent_collection")
  if (!gate.allowed) return { ok: false, blockers: gate.blockers }
  return { ok: true }
}

/** Deskulpt deposit holding — permanently fail-closed (Aloke Nov10). */
export function assertDepositHoldingAllowed():
  | { ok: true }
  | { ok: false; blockers: string[] } {
  const gate = featureGate("deposit_holding")
  if (!gate.allowed) return { ok: false, blockers: gate.blockers }
  return { ok: true }
}

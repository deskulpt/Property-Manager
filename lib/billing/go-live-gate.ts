/**
 * D10 go-live gate — fail-closed for live money (CFO + Legal + Eng).
 * Stripe + Stripe Tax path; no Razorpay Route; no Deskulpt-held deposits.
 */

export type GoLiveCheckId =
  | "live_tax_rates"
  | "signed_stripe_agreement"
  | "kyc_vendor_dpa"
  | "test_invoice_tax_lines"
  | "no_route_splits_confirmed"
  | "deposits_not_held_confirmed"

export type GoLiveCheck = {
  id: GoLiveCheckId
  label: string
  satisfied: boolean
  evidenceNote: string
}

export type GoLiveGateResult = {
  checks: GoLiveCheck[]
  readyForLiveMoney: boolean
  blockers: string[]
  labelledDemo: true
}

function envFlag(name: string): boolean {
  return process.env[name] === "1"
}

/**
 * Evaluate go-live readiness. Defaults fail-closed.
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
      label: "Deposit holds remain OFF (or 3 gates + Legal passed)",
      satisfied: overrides?.deposits_not_held_confirmed ?? envFlag("DEPOSITS_NOT_HELD_CONFIRMED"),
      evidenceNote: "Deposit holds flagged OFF until same three gates; else landlord/licensed escrow",
    },
  ]

  const blockers = checks.filter((c) => !c.satisfied).map((c) => c.label)
  return {
    checks,
    readyForLiveMoney: blockers.length === 0,
    blockers,
    labelledDemo: true,
  }
}

export function assertLiveMoneyAllowed():
  | { ok: true }
  | { ok: false; blockers: string[] } {
  const gate = evaluateGoLiveGate()
  if (!gate.readyForLiveMoney) return { ok: false, blockers: gate.blockers }
  return { ok: true }
}

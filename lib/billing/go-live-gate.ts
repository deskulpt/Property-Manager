/**
 * D10 go-live gate — fail-closed for live money (CFO + Legal + Eng).
 * Demo adapters remain until every check is true.
 */

export type GoLiveCheckId =
  | "live_tax_rates"
  | "signed_mor_contract"
  | "kyc_vendor_dpa"
  | "test_invoice_tax_lines"

export type GoLiveCheck = {
  id: GoLiveCheckId
  label: string
  /** Explicit evidence flag — never inferred from demo success */
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
 * Evaluate go-live readiness. Defaults all false (fail-closed).
 * Ops may flip TAX_LIVE_RATES=1, MOR_CONTRACT_SIGNED=1, KYC_DPA_SIGNED=1,
 * TEST_INVOICE_TAX_OK=1 only after real evidence — never from demo runs.
 */
export function evaluateGoLiveGate(overrides?: Partial<Record<GoLiveCheckId, boolean>>): GoLiveGateResult {
  const checks: GoLiveCheck[] = [
    {
      id: "live_tax_rates",
      label: "Live tax rates loaded and verified",
      satisfied: overrides?.live_tax_rates ?? envFlag("TAX_LIVE_RATES"),
      evidenceNote: "India specialist + CA GST/HST tables; no blanket 18%",
    },
    {
      id: "signed_mor_contract",
      label: "Signed MoR contract on file",
      satisfied: overrides?.signed_mor_contract ?? envFlag("MOR_CONTRACT_SIGNED"),
      evidenceNote: "Dodo (or chosen MoR) eligibility in writing — PayPal is not MoR",
    },
    {
      id: "kyc_vendor_dpa",
      label: "KYC vendor DPA signed",
      satisfied: overrides?.kyc_vendor_dpa ?? envFlag("KYC_DPA_SIGNED"),
      evidenceNote: "Processor / KYC DPA before live identity",
    },
    {
      id: "test_invoice_tax_lines",
      label: "Test invoice with correct tax lines",
      satisfied: overrides?.test_invoice_tax_lines ?? envFlag("TEST_INVOICE_TAX_OK"),
      evidenceNote: "Verified invoice: reverse charge / OIDAR / CA GST-HST lines correct",
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

/** Hard block helper for checkout / webhook live paths. */
export function assertLiveMoneyAllowed():
  | { ok: true }
  | { ok: false; blockers: string[] } {
  const gate = evaluateGoLiveGate()
  if (!gate.readyForLiveMoney) return { ok: false, blockers: gate.blockers }
  return { ok: true }
}

/**
 * Canada Stripe Connect E2E orchestration — landlord onboard → PAD → checkout → statement.
 *
 * Design/test only. Flags OFF. No live Stripe SDK calls. No live charges.
 * India money plane stays PARKED.
 */

import {
  CANADA_CONNECT_CHECKOUT,
  INDIA_MONEY_PARKED,
  buildCanadaConnectHostedCheckout,
  type CanadaConnectHostedCheckoutPlan,
} from "@/lib/billing/ca-connect-checkout"
import {
  activateCaPadMandate,
  getCaConnectAccount,
  getCaConnectCheckout,
  getCaLandlordStatement,
  insertCaConnectCheckout,
  insertCaPadMandate,
  listCaConnectCheckouts,
  listCaPadMandates,
  settleCaConnectCheckoutDemo,
  upsertCaConnectAccount,
  upsertCaLandlordStatement,
  type CaConnectAccountRow,
  type CaConnectCheckoutRow,
  type CaLandlordStatementRow,
  type CaPadMandateRow,
} from "@/lib/billing/ca-connect-store"
import {
  INDIA_MONEY_PLANE,
  LEGAL_FEATURE_FLAGS,
  RESERVED_HOST_PAY_FLAGS,
  assertIndiaMoneyParked,
} from "@/lib/billing/legal-flags"
import {
  ONTARIO_CONNECT_FEATURE,
  ontarioMonthlyStatementTaxFooter,
  quoteOntarioApplicationFee,
} from "@/lib/billing/ontario-connect"
import {
  DESKULPT_CANADA_LEGAL_NAME,
  DESKULPT_CANADA_TAX,
} from "@/lib/billing/tax-identity"

export const CANADA_CONNECT_E2E = {
  market: "CA" as const,
  province: "ON" as const,
  mode: "design_test_demo" as const,
  liveCharges: false as const,
  featureFlag: "ontarioConnectDirectPad" as const,
  featureFlagEnabled: false as const,
  indiaMoneyParked: INDIA_MONEY_PARKED,
  steps: ["onboard", "pad", "checkout", "statement"] as const,
  labelledDemo: true as const,
} as const

export type CanadaConnectE2EStep = (typeof CANADA_CONNECT_E2E.steps)[number]

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function demoConnectedAccountId(tenantId: string): string {
  const slug = tenantId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18) || "landlord"
  return `acct_demo_ca_${slug}`
}

/** Hard fail-closed: never allow live CA Connect charges in this slice. */
export function assertCanadaConnectDemoOnly(): void {
  assertIndiaMoneyParked()
  if (LEGAL_FEATURE_FLAGS.ontarioConnectDirectPad) {
    throw new Error(
      "ontarioConnectDirectPad unexpectedly ON — E2E demo path refuses live until Legal clearance wiring",
    )
  }
  if (RESERVED_HOST_PAY_FLAGS["ca-pay"]) {
    throw new Error("ca-pay host rail unexpectedly ON — keep OFF until Legal/ops")
  }
  if (ONTARIO_CONNECT_FEATURE.enabled) {
    throw new Error("ONTARIO_CONNECT_FEATURE.enabled unexpectedly true")
  }
  if (!INDIA_MONEY_PLANE.parked) {
    throw new Error("India money plane must stay PARKED during Canada Connect E2E")
  }
}

export function canadaConnectLiveBlockedReason(): string {
  return "ontarioConnectDirectPad OFF + Legal before-live list — demo/design-test only; no live charge"
}

/**
 * Step 1 — Landlord Stripe Connect Express-style onboarding (demo Account Link).
 * Creates/returns a pending connected account; does not call Stripe.
 */
export function startLandlordConnectOnboarding(input: {
  tenantId: string
  email: string
  returnUrl?: string
  refreshUrl?: string
}): {
  account: CaConnectAccountRow
  /** Stand-in for Stripe Account Link URL */
  demoAccountLinkUrl: string
  stripeAccountCreateBody: {
    type: "express"
    country: "CA"
    email: string
    capabilities: { card_payments: { requested: true }; transfers: { requested: true } }
    business_type: "company"
    metadata: Record<string, string>
  }
  liveEnabled: false
  blockedReason: string
  labelledDemo: true
} {
  assertCanadaConnectDemoOnly()
  const existing = getCaConnectAccount(input.tenantId)
  const connectedAccountId =
    existing?.connectedAccountId ?? demoConnectedAccountId(input.tenantId)
  const account = upsertCaConnectAccount({
    tenantId: input.tenantId,
    connectedAccountId,
    email: input.email,
    status: existing?.status === "onboarded" ? "onboarded" : "pending",
    chargesEnabled: existing?.chargesEnabled ?? false,
    payoutsEnabled: existing?.payoutsEnabled ?? false,
    onboardedAt: existing?.onboardedAt ?? null,
  })
  const returnUrl = input.returnUrl ?? "/landlord/billing/connect?onboard=done"
  const q = new URLSearchParams({
    acct: account.connectedAccountId,
    return: returnUrl,
    step: "onboard",
  })
  return {
    account,
    demoAccountLinkUrl: `/landlord/billing/connect/onboard?${q.toString()}`,
    stripeAccountCreateBody: {
      type: "express",
      country: "CA",
      email: input.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "company",
      metadata: {
        market: "CA",
        province: "ON",
        feature_flag: CANADA_CONNECT_E2E.featureFlag,
        labelled_demo: "1",
        india_money_parked: "1",
      },
    },
    liveEnabled: false,
    blockedReason: canadaConnectLiveBlockedReason(),
    labelledDemo: true,
  }
}

/** Complete demo onboarding — marks charges/payouts enabled in local store only. */
export function completeLandlordConnectOnboarding(tenantId: string): CaConnectAccountRow {
  assertCanadaConnectDemoOnly()
  const existing = getCaConnectAccount(tenantId)
  if (!existing) {
    throw new Error("No Connect account — start onboarding first")
  }
  return upsertCaConnectAccount({
    tenantId,
    connectedAccountId: existing.connectedAccountId,
    email: existing.email,
    status: "onboarded",
    chargesEnabled: true,
    payoutsEnabled: true,
    onboardedAt: existing.onboardedAt ?? new Date().toISOString(),
  })
}

/**
 * Step 2 — Optional PAD (ACSS debit) mandate on the landlord connected account.
 * Legal: PAD optional / never mandatory.
 */
export function startPadMandateSetup(input: {
  tenantId: string
  bankLast4: string
}): {
  mandate: CaPadMandateRow
  demoPadSetupUrl: string
  stripeSetupIntentBody: {
    payment_method_types: ["acss_debit"]
    payment_method_options: {
      acss_debit: {
        currency: "cad"
        mandate_options: {
          payment_schedule: "sporadic"
          transaction_type: "personal"
        }
      }
    }
    metadata: Record<string, string>
  }
  padOptionalNeverMandatory: true
  liveEnabled: false
  blockedReason: string
  labelledDemo: true
} {
  assertCanadaConnectDemoOnly()
  const account = getCaConnectAccount(input.tenantId)
  if (!account || account.status !== "onboarded") {
    throw new Error("Complete Connect onboarding before PAD mandate")
  }
  const last4 = input.bankLast4.replace(/\D/g, "").slice(-4)
  if (last4.length !== 4) {
    throw new Error("bankLast4 must be 4 digits (demo)")
  }
  const mandate = insertCaPadMandate({
    id: newId("pad"),
    tenantId: input.tenantId,
    connectedAccountId: account.connectedAccountId,
    status: "pending",
    bankLast4: last4,
  })
  const q = new URLSearchParams({
    mandate: mandate.id,
    acct: account.connectedAccountId,
    last4,
  })
  return {
    mandate,
    demoPadSetupUrl: `/landlord/billing/connect/pad?${q.toString()}`,
    stripeSetupIntentBody: {
      payment_method_types: ["acss_debit"],
      payment_method_options: {
        acss_debit: {
          currency: "cad",
          mandate_options: {
            payment_schedule: "sporadic",
            transaction_type: "personal",
          },
        },
      },
      metadata: {
        market: "CA",
        province: "ON",
        pad_optional: "1",
        labelled_demo: "1",
      },
    },
    padOptionalNeverMandatory: true,
    liveEnabled: false,
    blockedReason: canadaConnectLiveBlockedReason(),
    labelledDemo: true,
  }
}

export function completePadMandateDemo(mandateId: string): CaPadMandateRow {
  assertCanadaConnectDemoOnly()
  const mandate = activateCaPadMandate(mandateId)
  if (!mandate) throw new Error("PAD mandate not found")
  return mandate
}

/**
 * Step 3 — Hosted Checkout plan + open demo session (no live charge).
 */
export function startCanadaRentCheckout(input: {
  tenantId: string
  customerEmail: string
  rentCadCents: number
  paymentsFeeBps?: number
  unitCount?: number
  padMandateId?: string | null
  successUrl?: string
  cancelUrl?: string
}): {
  checkout: CaConnectCheckoutRow
  plan: CanadaConnectHostedCheckoutPlan
  liveEnabled: false
  liveCharge: false
  labelledDemo: true
} {
  assertCanadaConnectDemoOnly()
  const account = getCaConnectAccount(input.tenantId)
  if (!account || account.status !== "onboarded") {
    throw new Error("Complete Connect onboarding before rent checkout")
  }
  if (input.padMandateId) {
    const mandates = listCaPadMandates(input.tenantId)
    const found = mandates.find((m) => m.id === input.padMandateId)
    if (!found || found.status !== "active") {
      throw new Error("PAD mandate must be active when supplied")
    }
  }
  const clientReferenceId = newId("rent")
  const plan = buildCanadaConnectHostedCheckout({
    connectedAccountId: account.connectedAccountId,
    rentCadCents: input.rentCadCents,
    paymentsFeeBps: input.paymentsFeeBps,
    unitCount: input.unitCount,
    customerEmail: input.customerEmail,
    successUrl: input.successUrl ?? "/landlord/billing/connect?checkout=demo_settled",
    cancelUrl: input.cancelUrl ?? "/landlord/billing/connect?checkout=canceled",
    clientReferenceId,
  })
  if (plan.liveEnabled) {
    throw new Error("Refuse live-enabled Connect plan in E2E demo slice")
  }
  const checkout = insertCaConnectCheckout({
    id: newId("cs_demo"),
    tenantId: input.tenantId,
    connectedAccountId: account.connectedAccountId,
    clientReferenceId,
    rentCadCents: plan.quote.rentCadCents,
    applicationFeeInclusiveCadCents: plan.quote.applicationFeeInclusiveCadCents,
    padMandateId: input.padMandateId ?? null,
  })
  return {
    checkout,
    plan,
    liveEnabled: false,
    liveCharge: false,
    labelledDemo: true,
  }
}

/** Confirm demo rent settlement — never sets live_charge. */
export function confirmCanadaRentCheckoutDemo(checkoutId: string): CaConnectCheckoutRow {
  assertCanadaConnectDemoOnly()
  const existing = getCaConnectCheckout(checkoutId)
  if (!existing) throw new Error("Checkout not found")
  if (existing.liveCharge) {
    throw new Error("Refuse live charge confirmation")
  }
  const settled = settleCaConnectCheckoutDemo(checkoutId)
  if (!settled || settled.liveCharge) {
    throw new Error("Demo settle failed or attempted live charge")
  }
  return settled
}

export type CanadaLandlordMonthlyStatement = {
  market: "CA"
  province: "ON"
  periodYyyyMm: string
  sellerLegalName: typeof DESKULPT_CANADA_LEGAL_NAME
  gstHstNumber: string
  connectedAccountId: string | null
  lines: Array<{
    checkoutId: string
    clientReferenceId: string
    rentCadCents: number
    applicationFeeInclusiveCadCents: number
    settledAt: string | null
  }>
  totals: {
    rentCadCents: number
    applicationFeeExclusiveCadCents: number
    hstCadCents: number
    applicationFeeInclusiveCadCents: number
  }
  taxFooter: ReturnType<typeof ontarioMonthlyStatementTaxFooter>
  demoOnly: true
  liveCharge: false
  indiaMoneyParked: true
  labelledDemo: true
}

/**
 * Step 4 — Monthly landlord statement with Deskulpt GST/HST # (from CountryPack).
 */
export function buildCanadaLandlordMonthlyStatement(input: {
  tenantId: string
  periodYyyyMm?: string
}): {
  statement: CanadaLandlordMonthlyStatement
  row: CaLandlordStatementRow
  liveEnabled: false
  labelledDemo: true
} {
  assertCanadaConnectDemoOnly()
  const now = new Date()
  const period =
    input.periodYyyyMm ??
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
  const account = getCaConnectAccount(input.tenantId)
  const checkouts = listCaConnectCheckouts(input.tenantId).filter((c) => {
    if (c.status !== "demo_settled") return false
    const settled = c.settledAt ?? c.createdAt
    return settled.slice(0, 7) === period
  })
  let feeExclusive = 0
  const lines = checkouts.map((c) => {
    const quote = quoteOntarioApplicationFee({ rentCadCents: c.rentCadCents })
    feeExclusive += quote.applicationFeeExclusiveCadCents
    return {
      checkoutId: c.id,
      clientReferenceId: c.clientReferenceId,
      rentCadCents: c.rentCadCents,
      applicationFeeInclusiveCadCents: c.applicationFeeInclusiveCadCents,
      settledAt: c.settledAt,
    }
  })
  const taxFooter = ontarioMonthlyStatementTaxFooter({
    applicationFeeExclusiveCadCents: feeExclusive,
  })
  const statement: CanadaLandlordMonthlyStatement = {
    market: "CA",
    province: "ON",
    periodYyyyMm: period,
    sellerLegalName: DESKULPT_CANADA_LEGAL_NAME,
    gstHstNumber: DESKULPT_CANADA_TAX.gstHstNumber,
    connectedAccountId: account?.connectedAccountId ?? null,
    lines,
    totals: {
      rentCadCents: lines.reduce((s, l) => s + l.rentCadCents, 0),
      applicationFeeExclusiveCadCents: taxFooter.applicationFeeExclusiveCadCents,
      hstCadCents: taxFooter.hstCadCents,
      applicationFeeInclusiveCadCents: taxFooter.applicationFeeInclusiveCadCents,
    },
    taxFooter,
    demoOnly: true,
    liveCharge: false,
    indiaMoneyParked: true,
    labelledDemo: true,
  }
  const row = upsertCaLandlordStatement({
    id: newId("stmt"),
    tenantId: input.tenantId,
    periodYyyyMm: period,
    statementJson: JSON.stringify(statement),
  })
  return { statement, row, liveEnabled: false, labelledDemo: true }
}

export function readCanadaLandlordMonthlyStatement(
  tenantId: string,
  periodYyyyMm: string,
): CanadaLandlordMonthlyStatement | null {
  const row = getCaLandlordStatement(tenantId, periodYyyyMm)
  if (!row) return null
  return JSON.parse(row.statementJson) as CanadaLandlordMonthlyStatement
}

export type CanadaConnectE2EReport = {
  ok: true
  stepsCompleted: CanadaConnectE2EStep[]
  account: CaConnectAccountRow
  mandate: CaPadMandateRow
  checkout: CaConnectCheckoutRow
  statement: CanadaLandlordMonthlyStatement
  liveEnabled: false
  liveCharge: false
  indiaMoneyParked: true
  featureFlag: "ontarioConnectDirectPad"
  featureFlagEnabled: false
  canadaConnectCheckout: typeof CANADA_CONNECT_CHECKOUT
  labelledDemo: true
}

/**
 * Full demo pipeline: onboard → PAD → hosted checkout → demo settle → statement.
 * Always demo-only; throws if any live gate opens.
 */
export function runCanadaConnectDemoE2E(input: {
  tenantId: string
  email: string
  rentCadCents: number
  bankLast4?: string
  paymentsFeeBps?: number
}): CanadaConnectE2EReport {
  assertCanadaConnectDemoOnly()
  startLandlordConnectOnboarding({ tenantId: input.tenantId, email: input.email })
  const account = completeLandlordConnectOnboarding(input.tenantId)
  const padStart = startPadMandateSetup({
    tenantId: input.tenantId,
    bankLast4: input.bankLast4 ?? "4242",
  })
  const mandate = completePadMandateDemo(padStart.mandate.id)
  const started = startCanadaRentCheckout({
    tenantId: input.tenantId,
    customerEmail: input.email,
    rentCadCents: input.rentCadCents,
    paymentsFeeBps: input.paymentsFeeBps,
    padMandateId: mandate.id,
  })
  const checkout = confirmCanadaRentCheckoutDemo(started.checkout.id)
  const { statement } = buildCanadaLandlordMonthlyStatement({ tenantId: input.tenantId })
  return {
    ok: true,
    stepsCompleted: [...CANADA_CONNECT_E2E.steps],
    account,
    mandate,
    checkout,
    statement,
    liveEnabled: false,
    liveCharge: false,
    indiaMoneyParked: true,
    featureFlag: "ontarioConnectDirectPad",
    featureFlagEnabled: false,
    canadaConnectCheckout: CANADA_CONNECT_CHECKOUT,
    labelledDemo: true,
  }
}

export function canadaConnectE2EStatus(tenantId: string): {
  account: CaConnectAccountRow | null
  mandates: CaPadMandateRow[]
  checkouts: CaConnectCheckoutRow[]
  onboarded: boolean
  hasActivePad: boolean
  hasDemoSettlement: boolean
  liveEnabled: false
  blockedReason: string
  indiaMoneyParked: true
  labelledDemo: true
} {
  const account = getCaConnectAccount(tenantId)
  const mandates = listCaPadMandates(tenantId)
  const checkouts = listCaConnectCheckouts(tenantId)
  return {
    account,
    mandates,
    checkouts,
    onboarded: account?.status === "onboarded",
    hasActivePad: mandates.some((m) => m.status === "active"),
    hasDemoSettlement: checkouts.some((c) => c.status === "demo_settled"),
    liveEnabled: false,
    blockedReason: canadaConnectLiveBlockedReason(),
    indiaMoneyParked: true,
    labelledDemo: true,
  }
}

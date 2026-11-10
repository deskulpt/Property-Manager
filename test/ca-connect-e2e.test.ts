import { describe, expect, it } from "vitest"
import {
  CANADA_CONNECT_E2E,
  assertCanadaConnectDemoOnly,
  buildCanadaLandlordMonthlyStatement,
  canadaConnectE2EStatus,
  canadaConnectLiveBlockedReason,
  completeLandlordConnectOnboarding,
  completePadMandateDemo,
  confirmCanadaRentCheckoutDemo,
  runCanadaConnectDemoE2E,
  startCanadaRentCheckout,
  startLandlordConnectOnboarding,
  startPadMandateSetup,
} from "@/lib/billing/ca-connect-e2e"
import { resetCanadaConnectStoreCache } from "@/lib/billing/ca-connect-store"
import {
  INDIA_MONEY_PLANE,
  LEGAL_FEATURE_FLAGS,
  RESERVED_HOST_PAY_FLAGS,
  assertIndiaMoneyParked,
} from "@/lib/billing/legal-flags"
import { CANADA_PACK } from "@/lib/markets/packs"

describe("Canada Connect E2E — onboard → PAD → checkout → statement (demo)", () => {
  it("assert demo-only gates stay fail-closed", () => {
    expect(CANADA_CONNECT_E2E.liveCharges).toBe(false)
    expect(CANADA_CONNECT_E2E.featureFlagEnabled).toBe(false)
    expect(LEGAL_FEATURE_FLAGS.ontarioConnectDirectPad).toBe(false)
    expect(RESERVED_HOST_PAY_FLAGS["ca-pay"]).toBe(false)
    expect(RESERVED_HOST_PAY_FLAGS["in-pay"]).toBe(false)
    expect(INDIA_MONEY_PLANE.parked).toBe(true)
    expect(() => assertIndiaMoneyParked()).not.toThrow()
    expect(() => assertCanadaConnectDemoOnly()).not.toThrow()
    expect(canadaConnectLiveBlockedReason()).toMatch(/ontarioConnectDirectPad OFF/)
  })

  it("runs full landlord pipeline without live charge", async () => {
    const { getDb } = await import("@/lib/db")
    getDb()
    resetCanadaConnectStoreCache()

    const tenantId = `t_ca_e2e_${Date.now()}`
    const report = runCanadaConnectDemoE2E({
      tenantId,
      email: "landlord.ca@example.com",
      rentCadCents: 250_000,
      bankLast4: "1234",
      paymentsFeeBps: 50,
    })

    expect(report.ok).toBe(true)
    expect(report.stepsCompleted).toEqual(["onboard", "pad", "checkout", "statement"])
    expect(report.liveEnabled).toBe(false)
    expect(report.liveCharge).toBe(false)
    expect(report.indiaMoneyParked).toBe(true)
    expect(report.featureFlagEnabled).toBe(false)
    expect(report.account.status).toBe("onboarded")
    expect(report.account.chargesEnabled).toBe(true)
    expect(report.account.connectedAccountId).toMatch(/^acct_demo_ca_/)
    expect(report.mandate.status).toBe("active")
    expect(report.mandate.bankLast4).toBe("1234")
    expect(report.checkout.status).toBe("demo_settled")
    expect(report.checkout.liveCharge).toBe(false)
    expect(report.checkout.demoOnly).toBe(true)
    expect(report.statement.gstHstNumber).toBe(CANADA_PACK.taxRegistrationId)
    expect(report.statement.liveCharge).toBe(false)
    expect(report.statement.lines.length).toBe(1)
    expect(report.statement.totals.rentCadCents).toBe(250_000)
    expect(report.statement.totals.applicationFeeInclusiveCadCents).toBeGreaterThan(0)

    const status = canadaConnectE2EStatus(tenantId)
    expect(status.onboarded).toBe(true)
    expect(status.hasActivePad).toBe(true)
    expect(status.hasDemoSettlement).toBe(true)
    expect(status.liveEnabled).toBe(false)
  })

  it("PAD is optional — checkout works without mandate", async () => {
    const { getDb } = await import("@/lib/db")
    getDb()
    resetCanadaConnectStoreCache()

    const tenantId = `t_ca_nopad_${Date.now()}`
    startLandlordConnectOnboarding({ tenantId, email: "nopad@example.com" })
    completeLandlordConnectOnboarding(tenantId)
    const started = startCanadaRentCheckout({
      tenantId,
      customerEmail: "nopad@example.com",
      rentCadCents: 180_000,
    })
    expect(started.liveCharge).toBe(false)
    expect(started.plan.liveEnabled).toBe(false)
    expect(started.plan.stripeCheckoutSessionBody.payment_method_types).toContain("acss_debit")
    const settled = confirmCanadaRentCheckoutDemo(started.checkout.id)
    expect(settled.status).toBe("demo_settled")
    expect(settled.padMandateId).toBeNull()
    const { statement } = buildCanadaLandlordMonthlyStatement({ tenantId })
    expect(statement.lines.length).toBe(1)
  })

  it("refuses PAD before onboarding; refuses inactive mandate on checkout", async () => {
    const { getDb } = await import("@/lib/db")
    getDb()
    resetCanadaConnectStoreCache()

    const tenantId = `t_ca_gate_${Date.now()}`
    expect(() => startPadMandateSetup({ tenantId, bankLast4: "9999" })).toThrow(
      /onboarding/i,
    )

    startLandlordConnectOnboarding({ tenantId, email: "gate@example.com" })
    completeLandlordConnectOnboarding(tenantId)
    const pad = startPadMandateSetup({ tenantId, bankLast4: "9999" })
    expect(pad.padOptionalNeverMandatory).toBe(true)
    expect(pad.liveEnabled).toBe(false)
    // pending mandate must not be used for checkout
    expect(() =>
      startCanadaRentCheckout({
        tenantId,
        customerEmail: "gate@example.com",
        rentCadCents: 100_000,
        padMandateId: pad.mandate.id,
      }),
    ).toThrow(/active/i)
    completePadMandateDemo(pad.mandate.id)
    const ok = startCanadaRentCheckout({
      tenantId,
      customerEmail: "gate@example.com",
      rentCadCents: 100_000,
      padMandateId: pad.mandate.id,
    })
    expect(ok.checkout.padMandateId).toBe(pad.mandate.id)
  })
})

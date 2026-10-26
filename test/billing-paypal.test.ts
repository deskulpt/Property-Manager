import { afterEach, describe, expect, it } from "vitest"
import { createHmac } from "node:crypto"
import {
  DEFAULT_INR_PER_CAD,
  DEFAULT_INR_PER_USD,
  convertInrPaiseToForeignMinor,
  formatForeignMinor,
  inrPerForeignUnit,
  paypalSettlementCurrency,
} from "@/lib/billing/fx"
import {
  isIndiaBillingCountry,
  normalizeBillingCountry,
  parseBillingProviderName,
  resolvePrimaryProviderName,
  resolveProviderNameForPayer,
} from "@/lib/billing/routing"

const ENV_KEYS = [
  "BILLING_PROVIDER",
  "BILLING_INTL_PROVIDER",
  "BILLING_FORCE_PROVIDER",
  "PAYPAL_CHECKOUT_CURRENCY",
  "PAYPAL_INR_PER_CAD",
  "PAYPAL_INR_PER_USD",
  "PAYPAL_WEBHOOK_SECRET",
  "PAYPAL_WEBHOOK_ID",
] as const

const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}

function stashEnvOnce() {
  for (const k of ENV_KEYS) {
    if (!(k in saved)) saved[k] = process.env[k]
  }
}

function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
}

describe("billing country routing", () => {
  stashEnvOnce()
  afterEach(() => restoreEnv())

  it("normalizes country codes and defaults to IN", () => {
    expect(normalizeBillingCountry("ca")).toBe("CA")
    expect(normalizeBillingCountry("")).toBe("IN")
    expect(normalizeBillingCountry("India")).toBe("IN")
    expect(isIndiaBillingCountry("IN")).toBe(true)
    expect(isIndiaBillingCountry("US")).toBe(false)
  })

  it("routes India to BILLING_PROVIDER (primary MoR)", () => {
    process.env.BILLING_PROVIDER = "dodo"
    process.env.BILLING_INTL_PROVIDER = "paypal"
    delete process.env.BILLING_FORCE_PROVIDER
    expect(resolveProviderNameForPayer("IN")).toBe("dodo")
    expect(resolvePrimaryProviderName()).toBe("dodo")
  })

  it("routes outside India to PayPal by default", () => {
    process.env.BILLING_PROVIDER = "dodo"
    delete process.env.BILLING_INTL_PROVIDER
    delete process.env.BILLING_FORCE_PROVIDER
    expect(resolveProviderNameForPayer("CA")).toBe("paypal")
    expect(resolveProviderNameForPayer("US")).toBe("paypal")
    expect(resolveProviderNameForPayer("AE")).toBe("paypal")
  })

  it("allows configuring intl provider away from PayPal", () => {
    process.env.BILLING_PROVIDER = "stripe"
    process.env.BILLING_INTL_PROVIDER = "stripe"
    delete process.env.BILLING_FORCE_PROVIDER
    expect(resolveProviderNameForPayer("IN")).toBe("stripe")
    expect(resolveProviderNameForPayer("GB")).toBe("stripe")
  })

  it("honours BILLING_FORCE_PROVIDER over country", () => {
    process.env.BILLING_PROVIDER = "dodo"
    process.env.BILLING_INTL_PROVIDER = "paypal"
    process.env.BILLING_FORCE_PROVIDER = "demo"
    expect(resolveProviderNameForPayer("IN")).toBe("demo")
    expect(resolveProviderNameForPayer("CA")).toBe("demo")
  })

  it("parses provider names with fallback", () => {
    expect(parseBillingProviderName("paypal")).toBe("paypal")
    expect(parseBillingProviderName("nope", "dodo")).toBe("dodo")
  })
})

describe("PayPal FX (INR → CAD/USD)", () => {
  stashEnvOnce()
  afterEach(() => restoreEnv())

  it("defaults settlement to CAD for Canadian business account", () => {
    delete process.env.PAYPAL_CHECKOUT_CURRENCY
    expect(paypalSettlementCurrency()).toBe("CAD")
    process.env.PAYPAL_CHECKOUT_CURRENCY = "USD"
    expect(paypalSettlementCurrency()).toBe("USD")
  })

  it("converts inclusive INR paise using env rates", () => {
    delete process.env.PAYPAL_INR_PER_CAD
    delete process.env.PAYPAL_INR_PER_USD
    expect(inrPerForeignUnit("CAD")).toBe(DEFAULT_INR_PER_CAD)
    expect(inrPerForeignUnit("USD")).toBe(DEFAULT_INR_PER_USD)

    // ₹149.00 → 14900 paise → CAD at 61.5 INR/CAD
    const cadMinor = convertInrPaiseToForeignMinor(149_00, "CAD")
    expect(cadMinor).toBe(Math.round((149 / DEFAULT_INR_PER_CAD) * 100))
    expect(formatForeignMinor(cadMinor, "CAD")).toMatch(/\$/)

    process.env.PAYPAL_INR_PER_USD = "100"
    expect(convertInrPaiseToForeignMinor(100_00, "USD")).toBe(100) // $1.00
  })

  it("never returns zero minor units", () => {
    process.env.PAYPAL_INR_PER_CAD = "1000000"
    expect(convertInrPaiseToForeignMinor(1, "CAD")).toBe(1)
  })
})

describe("PayPal sandbox webhook signature", () => {
  stashEnvOnce()
  afterEach(() => restoreEnv())

  it("accepts HMAC transmission sig and rejects bad sig", async () => {
    process.env.PAYPAL_WEBHOOK_SECRET = "whsec_test"
    process.env.PAYPAL_WEBHOOK_ID = "WH-TEST"
    const { paypalBillingProvider, signPaypalSandboxWebhook } = await import(
      "@/lib/billing/providers/paypal"
    )
    const body = JSON.stringify({
      event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
      resource: { id: "I-SUB", custom_id: "sub-ref-1", subscriber: { payer_id: "PAYER1" } },
    })
    const sig = signPaypalSandboxWebhook(body, "whsec_test", "WH-TEST")
    const ok = await paypalBillingProvider.verifyAndParseWebhook({
      rawBody: body,
      signatureHeader: sig,
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.eventType).toBe("BILLING.SUBSCRIPTION.ACTIVATED")
      expect(ok.payload.clientReferenceId).toBe("sub-ref-1")
      expect(ok.payload.subscription_id).toBe("I-SUB")
    }

    const bad = await paypalBillingProvider.verifyAndParseWebhook({
      rawBody: body,
      signatureHeader: createHmac("sha256", "wrong").update(body).digest("hex"),
    })
    expect(bad.ok).toBe(false)
  })

  it("builds sandbox checkout URL with converted amount", async () => {
    delete process.env.PAYPAL_CLIENT_ID
    delete process.env.PAYPAL_CLIENT_SECRET
    process.env.PAYPAL_CHECKOUT_CURRENCY = "CAD"
    process.env.PAYPAL_INR_PER_CAD = "50"
    const { paypalBillingProvider } = await import("@/lib/billing/providers/paypal")
    const quote = {
      cadence: "monthly" as const,
      units: 1,
      lines: [],
      standardSubtotalPaise: 299_00,
      chargedSubtotalPaise: 149_00,
      gstPaise: Math.round(149_00 * 0.18),
      totalInclusivePaise: 149_00 + Math.round(149_00 * 0.18),
      savingsPaise: 0,
      pricingPath: "sale" as const,
      volumeDiscountPct: 0 as const,
      saleEligible: true,
      saleActive: true,
      strikeStandard: true,
      standardFromLabel: "Standard price (from 1 Apr 2027)",
      lockedUntilIso: null,
    }
    const session = await paypalBillingProvider.createCheckoutSession({
      tenantId: "t1",
      customerEmail: "nri@example.com",
      customerName: "NRI Owner",
      mix: [{ segment: "homes", count: 1 }],
      cadence: "monthly",
      quote,
      successUrl: "/ok",
      cancelUrl: "/cancel",
      clientReferenceId: "ref-abc",
      billingCountry: "CA",
    })
    expect(session.provider).toBe("paypal")
    expect(session.labelledTestMode).toBe(true)
    expect(session.settlementCurrency).toBe("CAD")
    expect(session.settlementAmountMinor).toBe(
      convertInrPaiseToForeignMinor(quote.totalInclusivePaise, "CAD"),
    )
    expect(session.url).toContain("provider=paypal")
    expect(session.url).toContain("currency=CAD")
  })
})

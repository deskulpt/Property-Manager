/**
 * Canada Stripe Connect — hosted Checkout session builders (DEMO / design-test).
 *
 * Finance D11 AwC: DIRECT charge on landlord connected account + PAD (optional);
 * Deskulpt takes application_fee only (HST computed/remitted by us).
 *
 * Live path gated by `ontarioConnectDirectPad` (OFF) + Legal before-live list.
 * No live Stripe SDK calls in this slice — payload shape is complete for E2E wiring.
 *
 * India money plane is PARKED — do not route rent/Razorpay/Route here.
 */

import { isLegalFeatureEnabled } from "@/lib/billing/legal-flags"
import {
  ONTARIO_CONNECT_FEATURE,
  quoteOntarioApplicationFee,
  type OntarioAppFeeQuote,
} from "@/lib/billing/ontario-connect"
import {
  DESKULPT_CANADA_LEGAL_NAME,
  DESKULPT_CANADA_TAX,
} from "@/lib/billing/tax-identity"

/** India pay-plane parked — Route / Razorpay / in-pay stay OFF for now. */
export const INDIA_MONEY_PARKED = true as const

export const CANADA_CONNECT_CHECKOUT = {
  market: "CA" as const,
  provinceLaunch: "ON" as const,
  chargeType: "direct" as const,
  checkoutMode: "payment" as const,
  uiMode: "hosted" as const,
  currency: "cad" as const,
  /** ACSS debit = Canadian PAD / pre-authorized debit */
  rentPaymentMethodTypes: ["acss_debit", "card"] as const,
  /** Card on rent path allowed for landlord tools only — never tenant convenience fee */
  tenantCardConvenienceFee: false,
  applicationFeeIncludesHst: true,
  hstComputedBy: "deskulpt" as const,
  connectCalculatesHst: false,
  featureFlag: "ontarioConnectDirectPad" as const,
  indiaMoneyParked: INDIA_MONEY_PARKED,
  labelledDemo: true as const,
} as const

export type CanadaConnectHostedCheckoutInput = {
  /** Stripe Connect account id for the landlord (acct_…). */
  connectedAccountId: string
  rentCadCents: number
  /** Optional override; defaults to config min bps. */
  paymentsFeeBps?: number
  unitCount?: number
  customerEmail: string
  successUrl: string
  cancelUrl: string
  clientReferenceId: string
  /** Idempotency key for Stripe Checkout Session create. */
  idempotencyKey?: string
}

/**
 * Stripe Checkout Sessions create body for Connect DIRECT + application fee.
 * Caller must send with `Stripe-Account: connectedAccountId` header (DIRECT).
 * Not for destination charges / separate charges.
 */
export type StripeConnectCheckoutSessionCreateBody = {
  mode: "payment"
  ui_mode: "hosted"
  success_url: string
  cancel_url: string
  customer_email: string
  client_reference_id: string
  currency: "cad"
  line_items: Array<{
    quantity: 1
    price_data: {
      currency: "cad"
      unit_amount: number
      product_data: {
        name: string
        description: string
      }
    }
  }>
  payment_method_types: Array<"acss_debit" | "card">
  payment_intent_data: {
    application_fee_amount: number
    description: string
    metadata: Record<string, string>
  }
  payment_method_options?: {
    acss_debit?: {
      currency: "cad"
      mandate_options: {
        payment_schedule: "sporadic"
        transaction_type: "personal"
      }
    }
  }
  metadata: Record<string, string>
}

export type CanadaConnectHostedCheckoutPlan = {
  ok: true
  liveEnabled: false | true
  blockedReason: string | null
  quote: OntarioAppFeeQuote
  /** Stripe API body — ready when Legal flips the flag + keys present. */
  stripeCheckoutSessionBody: StripeConnectCheckoutSessionCreateBody
  /** Header required for DIRECT charges. */
  stripeAccountHeader: string
  /** Demo / design-test hosted URL (always used while flag OFF or no live keys). */
  demoHostedCheckoutUrl: string
  sellerLegalName: typeof DESKULPT_CANADA_LEGAL_NAME
  gstHstNumber: string
  indiaMoneyParked: true
  labelledDemo: true
}

function demoHostedUrl(input: CanadaConnectHostedCheckoutInput, quote: OntarioAppFeeQuote): string {
  const q = new URLSearchParams({
    ref: input.clientReferenceId,
    acct: input.connectedAccountId,
    rent: String(quote.rentCadCents),
    fee: String(quote.applicationFeeInclusiveCadCents),
    provider: "stripe_connect_ca",
  })
  return `/landlord/billing/connect-checkout?${q.toString()}`
}

/**
 * Build a complete Canada Connect hosted-checkout plan.
 * Always returns demo URL while `ontarioConnectDirectPad` is OFF (default).
 * Does not call Stripe — payload is complete for future SDK wiring.
 */
export function buildCanadaConnectHostedCheckout(
  input: CanadaConnectHostedCheckoutInput,
): CanadaConnectHostedCheckoutPlan {
  const quote = quoteOntarioApplicationFee({
    rentCadCents: input.rentCadCents,
    paymentsFeeBps: input.paymentsFeeBps,
    unitCount: input.unitCount,
  })

  const liveFlag = isLegalFeatureEnabled("ontarioConnectDirectPad")
  const featureEnabled = ONTARIO_CONNECT_FEATURE.enabled === true && liveFlag
  const blockedReason = featureEnabled
    ? null
    : "ontarioConnectDirectPad OFF — design/test only; no live CA Connect charges until Legal"

  const stripeCheckoutSessionBody: StripeConnectCheckoutSessionCreateBody = {
    mode: "payment",
    ui_mode: "hosted",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
    client_reference_id: input.clientReferenceId,
    currency: "cad",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: quote.rentCadCents,
          product_data: {
            name: "Ontario residential rent (PAD)",
            description:
              "Rent collected on landlord Stripe Connect account (DIRECT). Deskulpt application fee separate.",
          },
        },
      },
    ],
    payment_method_types: [...CANADA_CONNECT_CHECKOUT.rentPaymentMethodTypes],
    payment_intent_data: {
      /** Inclusive of HST we compute — Connect does not calc HST on app fee. */
      application_fee_amount: quote.applicationFeeInclusiveCadCents,
      description: "Ontario rent — Deskulpt application fee incl. HST",
      metadata: {
        market: "CA",
        province: "ON",
        charge_type: "direct",
        hst_computed_by: "deskulpt",
        application_fee_exclusive_cad_cents: String(quote.applicationFeeExclusiveCadCents),
        hst_cad_cents: String(quote.hstCadCents),
        seller_legal_name: DESKULPT_CANADA_LEGAL_NAME,
        gst_hst_number: DESKULPT_CANADA_TAX.gstHstNumber,
        india_money_parked: "1",
      },
    },
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
      deskulpt_ref: input.clientReferenceId,
      connected_account: input.connectedAccountId,
      feature_flag: CANADA_CONNECT_CHECKOUT.featureFlag,
      labelled_demo: "1",
    },
  }

  return {
    ok: true,
    liveEnabled: false, // hard fail-closed in this slice — even if flag flipped without Legal keys
    blockedReason,
    quote,
    stripeCheckoutSessionBody,
    stripeAccountHeader: input.connectedAccountId,
    demoHostedCheckoutUrl: demoHostedUrl(input, quote),
    sellerLegalName: DESKULPT_CANADA_LEGAL_NAME,
    gstHstNumber: DESKULPT_CANADA_TAX.gstHstNumber,
    indiaMoneyParked: true,
    labelledDemo: true,
  }
}

/** Reverse application fee when PAD disputed — Finance D11. */
export function planReverseApplicationFeeOnPadDispute(input: {
  originalApplicationFeeInclusiveCadCents: number
  disputeId: string
}): {
  action: "refund_application_fee"
  amountCadCents: number
  disputeId: string
  enabledWhenLive: boolean
  labelledDemo: true
} {
  return {
    action: "refund_application_fee",
    amountCadCents: Math.max(0, Math.round(input.originalApplicationFeeInclusiveCadCents)),
    disputeId: input.disputeId,
    enabledWhenLive: ONTARIO_CONNECT_FEATURE.reverseFeeOnPadDispute,
    labelledDemo: true,
  }
}

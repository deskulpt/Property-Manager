import "server-only"
import {
  getMarket,
  type MarketId,
  type PaymentMethodKind,
} from "@/lib/market"

/**
 * Payment provider boundary. The demo adapter never contacts a processor
 * and never stores a full card, UPI, or Interac secret. A live adapter can
 * implement the same methods later. Selection is market-driven preferences.
 */
export interface PaymentProvider {
  readonly name: string
  readonly marketId: MarketId
  attachMethod(input: {
    userId: string
    tenantId: string
    kind: PaymentMethodKind
    last4: string
    autopay: boolean
  }): { providerRef: string; brand: string; last4: string }
  setAutopay(input: { providerRef: string; enabled: boolean }): {
    ok: true
    demo: true
  }
  collect(input: {
    providerRef: string
    amountCents: number
    description: string
  }): { ok: true; demo: true; reference: string }
}

function prefixForKind(kind: PaymentMethodKind): string {
  switch (kind) {
    case "upi":
      return "demo_upi"
    case "enach":
      return "demo_enach"
    case "interac":
      return "demo_interac"
    case "stripe_card":
      return "demo_stripe"
    case "card_demo":
      return "demo_card"
    default:
      return "demo_pay"
  }
}

export function createDemoPayments(marketId: MarketId): PaymentProvider {
  const market = getMarket(marketId)
  return {
    name: marketId === "CA" ? "demo-ca-interac-stripe" : "demo-in-razorpay",
    marketId,
    attachMethod(input) {
      const method =
        market.primaryPaymentMethods.find((item) => item.kind === input.kind) ??
        market.primaryPaymentMethods[0]
      return {
        providerRef: `${prefixForKind(input.kind)}_${input.last4}_${input.tenantId}`,
        brand: method.label,
        last4: input.last4,
      }
    },
    setAutopay() {
      return { ok: true, demo: true }
    },
    collect(input) {
      return {
        ok: true,
        demo: true,
        reference: `demo_txn_${input.providerRef}_${input.amountCents}`,
      }
    },
  }
}

/** @deprecated Prefer createDemoPayments(marketId) — defaults to India. */
export const demoPayments: PaymentProvider = createDemoPayments("IN")

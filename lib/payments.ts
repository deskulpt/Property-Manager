import "server-only"
import { activeMarket, type PaymentMethodKind } from "@/lib/market"

/**
 * Payment provider boundary. The demo adapter never contacts a processor
 * and never stores a full card or UPI secret. A live adapter can implement
 * the same methods later.
 */
export interface PaymentProvider {
  readonly name: string
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

export const demoPayments: PaymentProvider = {
  name: "demo-in",
  attachMethod(input) {
    const market = activeMarket()
    const method =
      market.primaryPaymentMethods.find((item) => item.kind === input.kind) ??
      market.primaryPaymentMethods[0]
    const prefix = input.kind === "upi" ? "demo_upi" : "demo_enach"
    return {
      providerRef: `${prefix}_${input.last4}_${input.tenantId}`,
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

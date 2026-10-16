import "server-only"

/**
 * Shop checkout payment boundary (PRD §15.3).
 * demoShopPay: local success, no network.
 * razorpayShopPay: selected when landlord keys exist and demo mode is off —
 * still does not call Razorpay HTTP in this OSS slice (no live charges).
 */
export type ShopPayResult = {
  ok: true
  provider: "demo" | "razorpay"
  reference: string
  labelledDemo: boolean
}

export interface ShopPaymentProvider {
  readonly name: string
  createOrder(input: {
    tenantId: string
    orderId: string
    amountCents: number
    description: string
  }): ShopPayResult
  confirmPayment(input: { reference: string }): { ok: true }
  refund(input: { reference: string; amountCents: number }): { ok: true; demo: true }
}

export const demoShopPay: ShopPaymentProvider = {
  name: "demoShopPay",
  createOrder(input) {
    return {
      ok: true,
      provider: "demo",
      reference: `demo_shop_${input.orderId}_${input.amountCents}`,
      labelledDemo: true,
    }
  },
  confirmPayment() {
    return { ok: true }
  },
  refund() {
    return { ok: true, demo: true }
  },
}

/** Stub adapter — never hits api.razorpay.com in this build. */
export const razorpayShopPay: ShopPaymentProvider = {
  name: "razorpayShopPay",
  createOrder(input) {
    return {
      ok: true,
      provider: "razorpay",
      reference: `rzp_order_stub_${input.orderId}`,
      labelledDemo: false,
    }
  },
  confirmPayment() {
    return { ok: true }
  },
  refund() {
    return { ok: true, demo: true }
  },
}

export function resolveShopPaymentProvider(settings: {
  demoMode: boolean
  hasSecret: boolean
  keyId: string | null
}): ShopPaymentProvider {
  if (settings.demoMode || !settings.hasSecret || !settings.keyId) {
    return demoShopPay
  }
  return razorpayShopPay
}

import "server-only"
import type { MarketId } from "@/lib/market"

/**
 * Shop checkout payment boundary (PRD §15.3).
 * Provider selection is market preference:
 *   IN → Razorpay (demo or stub when keys exist)
 *   CA → Interac / Stripe demo stubs
 * Never live-charges in this OSS slice.
 */
export type ShopPayResult = {
  ok: true
  provider: "demo" | "razorpay" | "interac" | "stripe"
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

/** Canada Interac demo stub — no live Interac API. */
export const interacShopPay: ShopPaymentProvider = {
  name: "interacShopPay",
  createOrder(input) {
    return {
      ok: true,
      provider: "interac",
      reference: `interac_demo_${input.orderId}`,
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

/** Canada Stripe/card demo stub — no live Stripe API. */
export const stripeShopPay: ShopPaymentProvider = {
  name: "stripeShopPay",
  createOrder(input) {
    return {
      ok: true,
      provider: "stripe",
      reference: `stripe_demo_${input.orderId}`,
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

export function resolveShopPaymentProvider(
  settings: {
    demoMode: boolean
    hasSecret: boolean
    keyId: string | null
  },
  marketId: MarketId = "IN",
  preferredGateway?: "razorpay" | "interac" | "stripe",
): ShopPaymentProvider {
  if (marketId === "CA") {
    if (preferredGateway === "stripe") return stripeShopPay
    return interacShopPay
  }
  if (settings.demoMode || !settings.hasSecret || !settings.keyId) {
    return demoShopPay
  }
  return razorpayShopPay
}

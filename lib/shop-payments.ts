import "server-only"
import { canUseRazorpayIndianEntity } from "@/lib/markets/payment-rails"

/**
 * Shop checkout payment boundary (PRD §15.3).
 * demoShopPay: local success, no network.
 * razorpayShopPay: selected when landlord keys exist, demo mode off, AND
 * razorpayIndianEntity LEGAL flag ON — still no Razorpay HTTP in this OSS slice.
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
  /** Country ISO for LEGAL_FEATURE_FLAGS — defaults IN. */
  countryIso?: string | null
}): ShopPaymentProvider {
  if (settings.demoMode || !settings.hasSecret || !settings.keyId) {
    return demoShopPay
  }
  // Live Razorpay stub path still requires Indian-entity LEGAL flag (fail-closed).
  if (!canUseRazorpayIndianEntity(settings.countryIso ?? "IN")) {
    return demoShopPay
  }
  return razorpayShopPay
}

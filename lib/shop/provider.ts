/**
 * ShopPaymentProvider — demo adapter until landlord Razorpay keys are set.
 * Live razorpayShopPay is a go-live gate; secret never returned to the client.
 */
export type ShopSku = {
  id: string
  tenantId: string
  propertyId: string | null
  name: string
  kind: "product" | "rental" | "booking"
  priceInrCents: number
  enabled: boolean
}

export interface ShopPaymentProvider {
  createOrder(input: { tenantId: string; amountInrCents: number; note: string }): Promise<{
    orderId: string
    mode: "demo" | "razorpay"
  }>
  confirmPayment(orderId: string): Promise<{ ok: boolean; reference: string }>
}

export const demoShopPay: ShopPaymentProvider = {
  async createOrder(input) {
    return { orderId: `demo_${input.tenantId}_${Date.now()}`, mode: "demo" }
  },
  async confirmPayment(orderId) {
    return { ok: true, reference: `pay_${orderId}` }
  },
}

export const SEED_SHOP_SKUS: Omit<ShopSku, "tenantId">[] = [
  { id: "sku_keys", propertyId: null, name: "Extra Keys", kind: "product", priceInrCents: 150000, enabled: true },
  { id: "sku_fob", propertyId: null, name: "Access FOB", kind: "product", priceInrCents: 250000, enabled: true },
  { id: "sku_filters", propertyId: null, name: "Air Filters", kind: "product", priceInrCents: 90000, enabled: true },
  { id: "sku_toolkit", propertyId: null, name: "Repair tool kit rental", kind: "rental", priceInrCents: 50000, enabled: true },
  { id: "sku_lift", propertyId: null, name: "Service Lift Booking", kind: "booking", priceInrCents: 200000, enabled: true },
]

/**
 * INR → CAD/USD conversion for PayPal (NRI / international) checkout.
 * Rates are env-only placeholders until Deskulpt Inc's Canadian PayPal account is wired.
 * Amounts: INR in paise; CAD/USD in minor units (cents).
 */

export type SettlementCurrency = "CAD" | "USD"

/** Default INR per 1 CAD / 1 USD — override via env; not live FX. */
export const DEFAULT_INR_PER_CAD = 61.5
export const DEFAULT_INR_PER_USD = 83

export function paypalSettlementCurrency(): SettlementCurrency {
  const raw = (process.env.PAYPAL_CHECKOUT_CURRENCY ?? "CAD").trim().toUpperCase()
  return raw === "USD" ? "USD" : "CAD"
}

export function inrPerForeignUnit(currency: SettlementCurrency): number {
  if (currency === "USD") {
    const n = Number(process.env.PAYPAL_INR_PER_USD ?? DEFAULT_INR_PER_USD)
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_INR_PER_USD
  }
  const n = Number(process.env.PAYPAL_INR_PER_CAD ?? DEFAULT_INR_PER_CAD)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_INR_PER_CAD
}

/**
 * Convert GST-inclusive INR paise to CAD/USD minor units (cents).
 * Rounds to nearest cent; minimum 1 minor unit so PayPal plans stay valid.
 */
export function convertInrPaiseToForeignMinor(
  inclusivePaise: number,
  currency: SettlementCurrency = paypalSettlementCurrency(),
): number {
  const inrMajor = Math.max(0, inclusivePaise) / 100
  const foreignMajor = inrMajor / inrPerForeignUnit(currency)
  return Math.max(1, Math.round(foreignMajor * 100))
}

export function formatForeignMinor(amountMinor: number, currency: SettlementCurrency): string {
  const major = amountMinor / 100
  return new Intl.NumberFormat(currency === "CAD" ? "en-CA" : "en-US", {
    style: "currency",
    currency,
  }).format(major)
}

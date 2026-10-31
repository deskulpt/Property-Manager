export const MARKET_COOKIE = "easyrental_market"
export const MARKET_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function normalizeMarketIso(raw: string | null | undefined): string {
  const iso = String(raw ?? "IN").trim().toUpperCase()
  return /^[A-Z]{2}$/.test(iso) ? iso : "IN"
}

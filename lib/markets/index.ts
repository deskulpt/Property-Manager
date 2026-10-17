import { marketCA } from "./ca"
import { marketIN } from "./in"
import type { DisplayCurrency, IdDocumentKind, MarketId, MarketProfile } from "./types"

export type {
  DisplayCurrency,
  IdDocumentKind,
  IdDocumentSpec,
  MarketId,
  MarketProfile,
  PaymentGatewayId,
  PaymentGatewaySpec,
  PaymentMethodKind,
  PaymentMethodSpec,
} from "./types"

export { marketCA } from "./ca"
export { marketIN } from "./in"

/** Preference registry — not parallel page trees. */
export const MARKETS: Record<MarketId, MarketProfile> = {
  IN: marketIN,
  CA: marketCA,
}

/** Default market when cookie / storage unset. */
export const DEFAULT_MARKET_ID: MarketId = "IN"

/** @deprecated Prefer getMarket / useMarket — kept for server helpers that still assume India. */
export const ACTIVE_MARKET_ID: MarketId = DEFAULT_MARKET_ID

export const MARKET_COOKIE = "market"
export const MARKET_STORAGE_KEY = "market"

export function isMarketId(value: string | null | undefined): value is MarketId {
  return value === "IN" || value === "CA"
}

export function parseMarketId(value: string | null | undefined): MarketId {
  if (isMarketId(value)) return value
  return DEFAULT_MARKET_ID
}

export function getMarket(id: MarketId = DEFAULT_MARKET_ID): MarketProfile {
  return MARKETS[id]
}

export function activeMarket(): MarketProfile {
  return MARKETS[DEFAULT_MARKET_ID]
}

export function documentForCountry(
  country: string,
  marketId: MarketId = DEFAULT_MARKET_ID,
): {
  docType: IdDocumentKind
  label: string
} {
  const market = getMarket(marketId)
  const hit = market.idDocuments.find((item) => item.country === country)
  if (hit) return { docType: hit.docType, label: hit.label }
  if (country === "Canada" || country === "CA") {
    return { docType: "driving_licence", label: "Provincial driver’s licence" }
  }
  if (country === "India" || country === "IN") {
    return { docType: "aadhaar", label: "Aadhaar" }
  }
  return { docType: "driving_licence", label: "Driving licence" }
}

export function gstCents(taxableMinor: number, market = activeMarket()) {
  return Math.round((taxableMinor * market.gstRateBps) / 10000)
}

/**
 * Demo FX only: major units of display currency per 1 INR.
 * Not a live rate. Used solely for landlord display preference.
 */
export const DEMO_FX_PER_INR: Record<DisplayCurrency, number> = {
  INR: 1,
  USD: 0.012,
  CAD: 0.016,
  GBP: 0.0095,
}

export const DEMO_FX_AS_OF = "2026-09-01 (demo table)"

export function convertFromInrMinor(
  inrMinor: number,
  display: DisplayCurrency,
): { major: number; currency: DisplayCurrency } {
  const rate = DEMO_FX_PER_INR[display] ?? 1
  return { major: (inrMinor / 100) * rate, currency: display }
}

export function formatDisplayMoney(inrMinor: number, display: DisplayCurrency = "INR") {
  const locale =
    display === "INR" ? "en-IN" : display === "GBP" ? "en-GB" : display === "CAD" ? "en-CA" : "en-US"
  if (display === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(inrMinor / 100)
  }
  const { major } = convertFromInrMinor(inrMinor, display)
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: display,
    maximumFractionDigits: 2,
  }).format(major)
}

export function moneyPair(inrMinor: number, display: DisplayCurrency = "INR") {
  const inr = formatDisplayMoney(inrMinor, "INR")
  if (display === "INR") return { primary: inr, secondary: null as string | null }
  return {
    primary: formatDisplayMoney(inrMinor, display),
    secondary: inr,
  }
}

export function formatMarketMoney(major: number, marketId: MarketId) {
  const market = getMarket(marketId)
  return new Intl.NumberFormat(market.locale, {
    style: "currency",
    currency: market.currency,
    maximumFractionDigits: market.id === "IN" ? 0 : 2,
  }).format(major)
}

export const PHONE_COUNTRY_CODES = [
  { code: "+91", label: "India (+91)", iso: "IN", nationalLength: 10 },
  { code: "+1", label: "US / Canada (+1)", iso: "CA", nationalLength: 10 },
  { code: "+44", label: "UK (+44)", iso: "GB", nationalLength: 10 },
  { code: "+971", label: "UAE (+971)", iso: "AE", nationalLength: 9 },
  { code: "+65", label: "Singapore (+65)", iso: "SG", nationalLength: 8 },
  { code: "+61", label: "Australia (+61)", iso: "AU", nationalLength: 9 },
] as const

export function formatPhoneDisplay(e164: string) {
  const match = e164.match(/^(\+\d{1,3})(\d+)$/)
  if (!match) return e164
  const [, cc, rest] = match
  if (cc === "+91" && rest.length === 10) return `${cc} ${rest.slice(0, 5)} ${rest.slice(5)}`
  if (cc === "+1" && rest.length === 10)
    return `${cc} (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`
  return `${cc} ${rest}`
}

export function toE164(countryCode: string, national: string): string | null {
  const cc = countryCode.startsWith("+") ? countryCode : `+${countryCode}`
  const digits = national.replace(/\D/g, "")
  if (!digits) return null
  const meta = PHONE_COUNTRY_CODES.find((item) => item.code === cc)
  if (meta && digits.length !== meta.nationalLength) return null
  if (!meta && (digits.length < 6 || digits.length > 14)) return null
  return `${cc}${digits}`
}

export function isE164(value: string) {
  return /^\+[1-9]\d{6,14}$/.test(value)
}

import {
  convertFromInrMinorMajor,
  gstCents as rustGstCents,
} from "@/lib/rust/money"

export type MarketId = string

export type DisplayCurrency = "INR" | "USD" | "CAD" | "GBP"

export type PaymentMethodKind = "upi" | "enach" | "card_demo" | "interac" | "stripe_card"

export type IdDocumentKind = "kyc_provider" | "driving_licence"

export type MarketProfile = {
  id: MarketId
  name: string
  locale: string
  currency: string
  currencyMinorPerMajor: number
  phoneCountryCode: string
  phonePlaceholder: string
  pinLabel: string
  pinPattern: RegExp
  pinPlaceholder: string
  rateUnitLabel: string
  ratePeriod: "month" | "year"
  gstRateBps: number
  gstLabel: string
  primaryPaymentMethods: { kind: PaymentMethodKind; label: string; hint: string }[]
  idDocuments: { country: string; docType: IdDocumentKind; label: string }[]
  defaultCountry: string
  statesLabel: string
  citiesHint: string
  displayCurrencies: DisplayCurrency[]
  esignProviders?: string[]
  smsProvider?: string
}

export const MARKETS: Record<MarketId, MarketProfile> = {
  IN: {
    id: "IN",
    name: "India",
    locale: "en-IN",
    currency: "INR",
    currencyMinorPerMajor: 100,
    phoneCountryCode: "+91",
    phonePlaceholder: "+91 98765 43210",
    pinLabel: "PIN code",
    pinPattern: /^\d{6}$/,
    pinPlaceholder: "400001",
    rateUnitLabel: "₹ / SF · month",
    ratePeriod: "month",
    gstRateBps: 1800,
    gstLabel: "GST (18%)",
    primaryPaymentMethods: [
      {
        kind: "upi",
        label: "UPI (demo)",
        hint: "VPA last segment only. Demo adapter — no NPCI call.",
      },
      {
        kind: "enach",
        label: "eNACH / auto-debit (demo)",
        hint: "Mandate last 4 digits. Demo adapter — no bank debit.",
      },
    ],
    idDocuments: [
      { country: "India", docType: "kyc_provider", label: "Licensed KYC provider (no Aadhaar image)" },
    ],
    defaultCountry: "India",
    statesLabel: "State / UT",
    citiesHint: "Mumbai, Bengaluru, Chennai, Hyderabad, Pune, NCR",
    displayCurrencies: ["INR", "USD", "CAD", "GBP"],
  },
}

export const ACTIVE_MARKET_ID: MarketId = "IN"

/** Session override set by MarketProvider / L0 promote tests. */
let sessionMarketIso: string | null = null

export function setSessionMarketIso(iso: string | null) {
  sessionMarketIso = iso ? iso.toUpperCase() : null
}

export function getSessionMarketIso() {
  return sessionMarketIso
}

function profileFromPack(pack: {
  iso: string
  name: string
  locale: string
  currency: string
  minorExponent: number
  gstBps: number
  taxLabels: string[]
  phoneCc: string
  postalRule: string
  postalLabel: string
  rateUnitLabel: string
  statesLabel: string
  citiesHint: string
  displayCurrencies: DisplayCurrency[]
  paymentMethods: { kind: PaymentMethodKind; label: string; hint: string }[]
  idDocuments: { country: string; docType: IdDocumentKind; label: string }[]
  esignProviders?: string[]
  smsProvider?: string
}): MarketProfile {
  let pinPattern = /^\d{6}$/
  try {
    pinPattern = new RegExp(pack.postalRule)
  } catch {
    pinPattern = /^\d{6}$/
  }
  return {
    id: pack.iso,
    name: pack.name,
    locale: pack.locale,
    currency: pack.currency,
    currencyMinorPerMajor: 10 ** pack.minorExponent,
    phoneCountryCode: pack.phoneCc,
    phonePlaceholder: pack.phoneCc === "+1" ? "+1 (416) 555-0100" : `${pack.phoneCc} 98765 43210`,
    pinLabel: pack.postalLabel,
    pinPattern,
    pinPlaceholder: pack.iso === "CA" ? "M5V 2T6" : "400001",
    rateUnitLabel: pack.rateUnitLabel,
    ratePeriod: "month",
    gstRateBps: pack.gstBps,
    gstLabel: pack.taxLabels[0] ?? "Tax",
    primaryPaymentMethods: pack.paymentMethods,
    idDocuments: pack.idDocuments,
    defaultCountry: pack.name,
    statesLabel: pack.statesLabel,
    citiesHint: pack.citiesHint,
    displayCurrencies: pack.displayCurrencies,
    esignProviders: pack.esignProviders,
    smsProvider: pack.smsProvider,
  }
}

type PackJson = Parameters<typeof profileFromPack>[0]

/** Injected by `lib/markets/store` after schema ensure — avoids db↔market require cycles. */
let livePackLookup: ((iso: string) => PackJson | null) | null = null

export function registerLivePackLookup(fn: ((iso: string) => PackJson | null) | null) {
  livePackLookup = fn
}

/**
 * Active market profile. Prefers live CountryPack (DB) for session/default ISO,
 * falls back to static MARKETS.IN. One UI — pack swaps schema, no /ca shard.
 */
export function activeMarket(preferredIso?: string | null): MarketProfile {
  const iso = (preferredIso || sessionMarketIso || ACTIVE_MARKET_ID).toUpperCase()
  if (livePackLookup) {
    const pack = livePackLookup(iso) || (iso !== "IN" ? livePackLookup("IN") : null)
    if (pack) return profileFromPack(pack)
  }
  return MARKETS.IN ?? Object.values(MARKETS)[0]
}

export function marketProfileForIso(iso: string): MarketProfile {
  return activeMarket(iso)
}

export function documentForCountry(country: string): {
  docType: IdDocumentKind
  label: string
} {
  const market = activeMarket()
  const hit = market.idDocuments.find((item) => item.country === country)
  if (hit) return { docType: hit.docType, label: hit.label }
  return { docType: "driving_licence", label: "Driving licence" }
}

export function gstCents(taxableMinor: number, market = activeMarket()) {
  return rustGstCents(taxableMinor, market.gstRateBps)
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
  return { major: convertFromInrMinorMajor(inrMinor, display), currency: display }
}

export function formatDisplayMoney(inrMinor: number, display: DisplayCurrency = "INR") {
  const locale = display === "INR" ? "en-IN" : display === "GBP" ? "en-GB" : display === "CAD" ? "en-CA" : "en-US"
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

export const PHONE_COUNTRY_CODES = [
  { code: "+91", label: "India (+91)", iso: "IN", nationalLength: 10 },
  { code: "+1", label: "US / Canada (+1)", iso: "US", nationalLength: 10 },
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
  if (cc === "+1" && rest.length === 10) return `${cc} (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`
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

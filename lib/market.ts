export type MarketId = "IN"

export type DisplayCurrency = "INR" | "USD" | "CAD" | "GBP"

export type PaymentMethodKind = "upi" | "enach" | "card_demo"

export type IdDocumentKind = "aadhaar" | "driving_licence"

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
      { country: "India", docType: "aadhaar", label: "Aadhaar" },
      { country: "Canada", docType: "driving_licence", label: "Driving licence" },
      { country: "United States", docType: "driving_licence", label: "Driving licence" },
      { country: "United Kingdom", docType: "driving_licence", label: "Driving licence" },
    ],
    defaultCountry: "India",
    statesLabel: "State / UT",
    citiesHint: "Mumbai, Bengaluru, Chennai, Hyderabad, Pune, NCR",
    displayCurrencies: ["INR", "USD", "CAD", "GBP"],
  },
}

export const ACTIVE_MARKET_ID: MarketId = "IN"

export function activeMarket(): MarketProfile {
  return MARKETS[ACTIVE_MARKET_ID]
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

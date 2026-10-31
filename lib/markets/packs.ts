import type { CountryPack } from "@/lib/markets/types"

/** India fixture — matches tip `MARKETS.IN` behaviour. */
export const INDIA_PACK: CountryPack = {
  iso: "IN",
  name: "India",
  locale: "en-IN",
  currency: "INR",
  minorExponent: 2,
  gstBps: 1800,
  taxLabels: ["GST (18%)"],
  phoneCc: "+91",
  postalRule: "^\\d{6}$",
  postalLabel: "PIN code",
  addressFieldOrder: ["line1", "area", "city", "state", "pin"],
  idDocuments: [
    {
      country: "India",
      docType: "kyc_provider",
      label: "Licensed KYC provider (no Aadhaar image)",
    },
  ],
  paymentMethods: [
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
  platformMoR: { domestic: "dodo", intl: "paypal" },
  esignProviders: ["demo", "digio", "emudhra"],
  smsProvider: "msg91",
  rentBasisDefault: "per_sqft_month",
  areaDisplayUnit: "sqft",
  rateUnitLabel: "₹ / SF · month",
  statesLabel: "State / UT",
  citiesHint: "Mumbai, Bengaluru, Chennai, Hyderabad, Pune, NCR",
  displayCurrencies: ["INR", "USD", "CAD", "GBP"],
  jurisdictionPresetRef: "IN",
  legalCopyKeys: ["terms-india", "privacy-india"],
}

/**
 * Canada pack — settings-only schema (demo adapters). Promote from L0 to go live.
 * No seeded CA portfolio until promote + legal copy.
 */
export const CANADA_PACK: CountryPack = {
  iso: "CA",
  name: "Canada",
  locale: "en-CA",
  currency: "CAD",
  minorExponent: 2,
  gstBps: 1300,
  taxLabels: ["GST/HST (demo 13%)", "PST prefs stub"],
  phoneCc: "+1",
  postalRule: "^[A-Za-z]\\d[A-Za-z][ -]?\\d[A-Za-z]\\d$",
  postalLabel: "Postal code",
  addressFieldOrder: ["line1", "city", "province", "postal"],
  idDocuments: [
    {
      country: "Canada",
      docType: "driving_licence",
      label: "Provincial driving licence",
    },
  ],
  paymentMethods: [
    {
      kind: "interac",
      label: "Interac (demo)",
      hint: "Test-mode label only — no live Interac network until go-live keys.",
    },
    {
      kind: "stripe_card",
      label: "Card via Stripe (demo)",
      hint: "Settings-panel preference — not live charges without Stripe secrets.",
    },
  ],
  platformMoR: { domestic: "paypal", intl: "paypal" },
  esignProviders: ["demo", "docusign"],
  smsProvider: "twilio",
  rentBasisDefault: "per_sqft_month",
  areaDisplayUnit: "sqft",
  rateUnitLabel: "C$ / SF · month",
  statesLabel: "Province / Territory",
  citiesHint: "Toronto, Vancouver, Montreal, Calgary, Ottawa",
  displayCurrencies: ["CAD", "USD", "INR"],
  jurisdictionPresetRef: "CA",
  legalCopyKeys: ["terms-india-canada", "privacy-india-canada"],
}

export const BUILTIN_PACKS: Record<string, CountryPack> = {
  IN: INDIA_PACK,
  CA: CANADA_PACK,
}

export function builtinPack(iso: string): CountryPack | null {
  return BUILTIN_PACKS[iso.toUpperCase()] ?? null
}

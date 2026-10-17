import type { MarketProfile } from "./types"

/**
 * Canada market preferences — same app shell as India.
 * CAD display, GST/HST/PST labels, Interac + Stripe adapters, provincial ID.
 */
export const marketCA: MarketProfile = {
  id: "CA",
  name: "Canada",
  flag: "🇨🇦",
  locale: "en-CA",
  currency: "CAD",
  currencyMinorPerMajor: 100,
  currencyLedgerNote:
    "Display and estimate corridors use CAD. Demo Interac / Stripe adapters — no live processor.",
  phoneCountryCode: "+1",
  phonePlaceholder: "+1 (416) 555-0142",
  pinLabel: "Postal code",
  pinPattern: /^[A-Za-z]\d[A-Za-z][ ]?\d[A-Za-z]\d$/,
  pinPlaceholder: "M5V 2T6",
  pinHint: "Canadian postal code (A1A 1A1). First letter maps to a demo corridor.",
  rateUnitLabel: "CA$ / SF · month",
  ratePeriod: "month",
  gstRateBps: 1300,
  gstLabel: "GST/HST (demo 13%)",
  primaryPaymentMethods: [
    {
      kind: "interac",
      label: "Interac e-Transfer (demo)",
      hint: "Email / phone last 4 only. Demo Interac adapter — no bank transfer.",
    },
    {
      kind: "stripe_card",
      label: "Card · Stripe (demo)",
      hint: "Last 4 digits only. Demo Stripe adapter — no card charge.",
    },
  ],
  paymentGateways: [
    {
      id: "interac",
      label: "Interac e-Transfer",
      hint: "Canada default for rent / deposit demos. No live Interac API in this build.",
      demoOnly: true,
    },
    {
      id: "stripe",
      label: "Stripe / card",
      hint: "Card and wallet adapter for CAD. Demo stub only — no Stripe secret required.",
      demoOnly: true,
    },
  ],
  idDocuments: [
    { country: "Canada", docType: "driving_licence", label: "Provincial driver’s licence" },
    { country: "Canada", docType: "sin", label: "SIN (last 3 stub)" },
  ],
  defaultCountry: "Canada",
  statesLabel: "Province / territory",
  citiesHint: "Toronto, Mississauga, Vancouver, Calgary, Montreal, Ottawa",
  displayCurrencies: ["CAD", "USD", "INR", "GBP"],
  commercialCallout:
    "Canada commercial leasing: provincial landlord–tenant / commercial tenancy rules differ by province. Easy Rental provides workflow software only — not brokerage, not legal advice. Confirm offer-to-lease, FIAT/rent deposit norms, and HST treatment with counsel for the property’s province.",
  verifyDocHint:
    "Canada demo path uses a provincial driver’s licence plus optional SIN last-3 stub. No ministry or CRA call; simulated match only.",
  dutiesTaxHint:
    "GST/HST/PST labels follow province prefs. Cross-border duties/tax prefs are settings stubs — confirm with counsel.",
}

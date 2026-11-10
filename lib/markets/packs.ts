import type { CountryPack } from "@/lib/markets/types"

/** India fixture — matches tip `MARKETS.IN` behaviour + `/in` path segment. */
export const INDIA_PACK: CountryPack = {
  iso: "IN",
  name: "India",
  pathSegment: "in",
  legalEntity: "Deskulpt Commerce India Pvt Ltd",
  locale: "en-IN",
  currency: "INR",
  minorExponent: 2,
  gstBps: 1800,
  taxLabels: ["GST (18%)"],
  taxAdapter: {
    kind: "in_gst_matrix",
    enabled: false,
    notes: "IN tax matrix gated OFF pending tax specialist (D13-related). Aloke AwC; flag OFF.",
  },
  paymentRails: {
    kinds: ["upi_demo", "enach_demo", "razorpay_in_entity"],
    notes:
      "Razorpay OFF until Deskulpt Commerce India Pvt Ltd + written Razorpay acceptance + Legal. Aloke AwC; flag OFF.",
  },
  legalFeatureFlags: {
    // Fail-closed — Aloke AwC on D11–D15; live flags stay OFF.
    ontarioConnectDirectPad: false,
    caStripeTaxHst: false,
    inTaxMatrix: false,
    razorpayIndianEntity: false,
    routeHolds: false,
    depositHolds: false,
    onStandardLeaseLive: false,
    tgProductionLease: false,
    mandatoryTenantSurcharge: false,
    eStore: false,
    concierge: false,
    affiliate: false,
    realPiiAiConnectorsMedia: false,
  },
  dataResidency: {
    region: "IN",
    notes:
      "Prefer India-region processing for Deskulpt Commerce India Pvt Ltd personal data when live; synthetic demo until privacy/security gates close. AI: Cloudflare AI Gateway + Workers AI + neuron limits; real PII blocked.",
    enforcedByStorage: false,
  },
  leaseTemplates: [
    {
      id: "tg-disclaimer-demo",
      label: "Telangana residential/commercial disclaimer (synthetic demo)",
      jurisdiction: "TG",
      status: "draft",
      disclaimerKey: "lease-tg-demo-disclaimer",
    },
  ],
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
  legalCopyKeys: ["terms-india", "privacy-india", "lease-tg-demo-disclaimer"],
}

/**
 * Canada pack — `/ca` path segment + Ontario rails (flags OFF).
 * Promote from L0 to go live. No Aloke Approve of D11/D13.
 */
export const CANADA_PACK: CountryPack = {
  iso: "CA",
  name: "Canada",
  pathSegment: "ca",
  legalEntity: "Deskulpt Inc",
  // Sourced from PRD checklist Entities row (Aloke Nov7) — for statements when tax flag ON.
  taxRegistrationId: "739660629RT0001",
  locale: "en-CA",
  currency: "CAD",
  minorExponent: 2,
  gstBps: 1300,
  taxLabels: ["GST/HST (demo 13%)", "PST prefs stub"],
  taxAdapter: {
    kind: "ca_stripe_tax_hst",
    enabled: false,
    notes:
      "Stripe Tax / HST adapter gated OFF (caStripeTaxHst). Deskulpt Inc federal CA; GST/HST registration recorded on pack. Aloke AwC; flags OFF.",
  },
  paymentRails: {
    kinds: ["interac_demo", "stripe_subscriptions_ca", "stripe_connect_direct_pad"],
    notes:
      "Stripe Connect DIRECT+PAD (ontarioConnectDirectPad) OFF until Legal ON gates. Stripe subscriptions = Deskulpt Inc (CA). Aloke AwC; flags OFF.",
  },
  legalFeatureFlags: {
    ontarioConnectDirectPad: false,
    caStripeTaxHst: false,
    inTaxMatrix: false,
    razorpayIndianEntity: false,
    routeHolds: false,
    depositHolds: false,
    onStandardLeaseLive: false,
    tgProductionLease: false,
    mandatoryTenantSurcharge: false,
    eStore: false,
    concierge: false,
    affiliate: false,
    realPiiAiConnectorsMedia: false,
  },
  dataResidency: {
    region: "CA",
    notes:
      "Prefer Canadian/North-America processing for Deskulpt Inc personal data when live; synthetic demo until privacy/security gates close. AI: Cloudflare AI Gateway + Workers AI + neuron limits; real PII blocked.",
    enforcedByStorage: false,
  },
  leaseTemplates: [
    {
      id: "on-standard-lease",
      label: "Ontario Standard Lease (template)",
      jurisdiction: "ON",
      status: "draft",
      disclaimerKey: "lease-on-standard-disclaimer",
    },
  ],
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
  legalCopyKeys: ["terms-india-canada", "privacy-india-canada", "lease-on-standard-disclaimer"],
}

export const BUILTIN_PACKS: Record<string, CountryPack> = {
  IN: INDIA_PACK,
  CA: CANADA_PACK,
}

export function builtinPack(iso: string): CountryPack | null {
  return BUILTIN_PACKS[iso.toUpperCase()] ?? null
}

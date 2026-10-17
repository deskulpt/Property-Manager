export type MarketId = "IN" | "CA"

export type DisplayCurrency = "INR" | "USD" | "CAD" | "GBP"

/** Rent / ledger payment method kinds shown in pay desk + settings. */
export type PaymentMethodKind =
  | "upi"
  | "enach"
  | "interac"
  | "stripe_card"
  | "card_demo"

/** Shop / platform gateway adapter ids selected by market. */
export type PaymentGatewayId = "razorpay" | "interac" | "stripe"

export type IdDocumentKind = "aadhaar" | "driving_licence" | "sin"

export type PaymentMethodSpec = {
  kind: PaymentMethodKind
  label: string
  hint: string
}

export type PaymentGatewaySpec = {
  id: PaymentGatewayId
  label: string
  hint: string
  /** Demo adapter only — never live-charges in this build. */
  demoOnly: boolean
}

export type IdDocumentSpec = {
  country: string
  docType: IdDocumentKind
  label: string
}

/**
 * Market config object — preference layer only.
 * One codebase / one UI; flag switch swaps this object (currency, tax,
 * logistics, gateways, verification kinds). Not a page-tree shard.
 */
export type MarketProfile = {
  id: MarketId
  name: string
  flag: string
  locale: string
  currency: string
  currencyMinorPerMajor: number
  currencyLedgerNote: string
  phoneCountryCode: string
  phonePlaceholder: string
  pinLabel: string
  pinPattern: RegExp
  pinPlaceholder: string
  pinHint: string
  rateUnitLabel: string
  ratePeriod: "month" | "year"
  gstRateBps: number
  gstLabel: string
  primaryPaymentMethods: PaymentMethodSpec[]
  /** Active payment gateways for Settings → Market & payments. */
  paymentGateways: PaymentGatewaySpec[]
  idDocuments: IdDocumentSpec[]
  defaultCountry: string
  statesLabel: string
  citiesHint: string
  displayCurrencies: DisplayCurrency[]
  commercialCallout: string
  verifyDocHint: string
  dutiesTaxHint: string
}

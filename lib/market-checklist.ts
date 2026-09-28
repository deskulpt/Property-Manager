/**
 * Next-market checklist keys. India is live; drafts must finish every row
 * before the country appears on public forms. Do not seed parked markets.
 */
export const MARKET_CHECKLIST_KEYS = [
  "currency",
  "address_fields",
  "phone_code",
  "id_document",
  "tax_id_label",
  "rent_basis",
  "area_unit",
  "payment_methods",
] as const

export type MarketChecklistKey = (typeof MARKET_CHECKLIST_KEYS)[number]

export const MARKET_CHECKLIST_LABELS: Record<MarketChecklistKey, string> = {
  currency: "Currency code, minor-unit exponent, and locale grouping",
  address_fields: "Address field set, order, and postal-code rule",
  phone_code: "Phone country code and example E.164 number",
  id_document: "ID document type for verification (never Aadhaar outside India)",
  tax_id_label: "Tax and registration identifiers: label, mask, and tier",
  rent_basis: "Rent basis default (per area per month, per area per year, or total)",
  area_unit: "Area display unit (square metres still stored)",
  payment_methods: "Payment methods the landlord may offer",
}

/** ISO codes that must never be seeded as live or demo markets. */
export const PARKED_MARKET_ISOS = ["US", "CA", "BR", "GB"] as const

export const LIVE_MARKET = {
  iso: "IN",
  name: "India",
} as const

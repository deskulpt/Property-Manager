/**
 * Platform subscription tax adapter (CFO D01 — DEMO/STUB).
 *
 * Deskulpt Inc is Canadian. Subscriptions via Stripe (processor).
 * Tax path: **Stripe Tax** calculates; Deskulpt files/remits (not MoR-as-seller).
 * - CA (Ontario launch): Stripe Tax HST
 * - India B2B with GSTIN: reverse charge (platform does not collect IN GST)
 * - India without GSTIN: blocked / entity+GST gate (Telangana gated)
 *
 * NOT live tax advice. Stripe Tax live rates required at D10 go-live.
 */

export type CustomerKind = "business" | "consumer"

export type TaxCollector =
  | "deskulpt_via_stripe_tax"
  | "customer_reverse_charge"
  | "none"

export type TaxTreatment =
  | "in_b2b_reverse_charge"
  | "in_b2c_blocked_pending_entity"
  | "ca_gst_hst_stripe_tax"
  | "zero_rated_export"
  | "blocked_missing_registration"
  | "unknown"

export type TaxCustomer = {
  country: string
  /** CA province / IN state — Ontario + Telangana are launch targets */
  region?: string | null
  kind: CustomerKind
  /** India GSTIN or CA BN */
  taxId?: string | null
  /**
   * When true (default for Stripe subscription path), amounts are calculated
   * as Stripe Tax would — Deskulpt remits. Not “MoR collects / step aside”.
   */
  stripeTaxEnabled?: boolean
}

export type TaxLine = {
  code: string
  label: string
  rateBps: number
  amountMinor: number
  calculatedBy: "stripe_tax_stub" | "reverse_charge" | "none"
}

export type TaxQuote = {
  treatment: TaxTreatment
  collector: TaxCollector
  taxableMinor: number
  lines: TaxLine[]
  taxMinor: number
  totalInclusiveMinor: number
  dependencies: string[]
  labelledDemo: true
  notes: string[]
  /** Launch market hint */
  launchMarket: "ontario" | "telangana" | "other" | "unknown"
}

export const CA_GST_HST_BPS: Record<string, number> = {
  AB: 500,
  BC: 500,
  MB: 500,
  NB: 1500,
  NL: 1500,
  NS: 1500,
  NT: 500,
  NU: 500,
  ON: 1300, // HST 13% — Ontario launch
  PE: 1500,
  QC: 500,
  SK: 500,
  YT: 500,
}

export const IN_GST_BPS = 1800

export function hasIndianGstRegistration(): boolean {
  return process.env.TAX_IN_GST_REGISTERED === "1"
}

export function normalizeCountry(raw: string | null | undefined): string {
  const c = (raw ?? "").trim().toUpperCase()
  return /^[A-Z]{2}$/.test(c) ? c : ""
}

export function normalizeRegion(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase()
}

export function hasBusinessTaxId(taxId: string | null | undefined): boolean {
  return Boolean(taxId && taxId.trim().length >= 5)
}

function launchMarketFor(country: string, region: string): TaxQuote["launchMarket"] {
  if (country === "CA" && (region === "ON" || region === "")) return "ontario"
  if (country === "IN" && (region === "TG" || region === "TS" || region === "TELANGANA")) {
    return "telangana"
  }
  if (country === "CA" || country === "IN") return "other"
  return "unknown"
}

/**
 * Resolve tax on a platform SaaS subtotal (exclusive minor units).
 * Models Stripe Tax calculation + Deskulpt remittance (demo rates).
 */
export function quoteSubscriptionTax(input: {
  exclusiveMinor: number
  customer: TaxCustomer
  currency?: string
}): TaxQuote {
  const taxableMinor = Math.max(0, Math.round(input.exclusiveMinor))
  const country = normalizeCountry(input.customer.country)
  const region = normalizeRegion(input.customer.region)
  const deps: string[] = []
  const notes: string[] = [
    "DEMO/STUB — Stripe Tax path; Deskulpt remits; live Stripe Tax tables at D10",
  ]
  const launchMarket = launchMarketFor(country, region)
  const stripeTax = input.customer.stripeTaxEnabled !== false

  if (!country) {
    return {
      treatment: "unknown",
      collector: "none",
      taxableMinor,
      lines: [],
      taxMinor: 0,
      totalInclusiveMinor: taxableMinor,
      dependencies: ["customer.country required for tax"],
      labelledDemo: true,
      notes,
      launchMarket: "unknown",
    }
  }

  // India
  if (country === "IN") {
    const isBiz = input.customer.kind === "business" && hasBusinessTaxId(input.customer.taxId)
    if (isBiz) {
      notes.push("India B2B reverse charge with GSTIN — Stripe Tax / invoice line shows RC")
      if (launchMarket === "telangana") {
        deps.push("Telangana gated on entity + GST questions (Finance D13)")
      }
      return {
        treatment: "in_b2b_reverse_charge",
        collector: "customer_reverse_charge",
        taxableMinor,
        lines: [],
        taxMinor: 0,
        totalInclusiveMinor: taxableMinor,
        dependencies: deps,
        labelledDemo: true,
        notes,
        launchMarket,
      }
    }

    deps.push(
      "India without GSTIN / B2C: Telangana gated on entity+GST; Indian director option open (Aloke BM)",
    )
    if (!hasIndianGstRegistration()) {
      return {
        treatment: "blocked_missing_registration",
        collector: "none",
        taxableMinor,
        lines: [],
        taxMinor: 0,
        totalInclusiveMinor: taxableMinor,
        dependencies: deps,
        labelledDemo: true,
        notes: [...notes, "Do not collect IN GST without entity/registration decision"],
        launchMarket,
      }
    }

    return {
      treatment: "in_b2c_blocked_pending_entity",
      collector: "none",
      taxableMinor,
      lines: [],
      taxMinor: 0,
      totalInclusiveMinor: taxableMinor,
      dependencies: deps,
      labelledDemo: true,
      notes,
      launchMarket,
    }
  }

  // Canada — Stripe Tax HST/GST stub (Ontario first)
  if (country === "CA") {
    const bps = CA_GST_HST_BPS[region || "ON"] ?? 500
    const taxMinor = stripeTax ? Math.round((taxableMinor * bps) / 10_000) : 0
    const label =
      bps >= 1300 ? `HST via Stripe Tax (${(bps / 100).toFixed(0)}%)` : `GST via Stripe Tax (${(bps / 100).toFixed(0)}%)`
    if (!region) deps.push("CA province recommended; defaulted Ontario HST for launch stub")
    notes.push("Deskulpt files/remits; Stripe is processor not MoR")
    return {
      treatment: "ca_gst_hst_stripe_tax",
      collector: "deskulpt_via_stripe_tax",
      taxableMinor,
      lines: [
        {
          code: `CA_STRIPE_TAX_${region || "ON"}`,
          label,
          rateBps: bps,
          amountMinor: taxMinor,
          calculatedBy: "stripe_tax_stub",
        },
      ],
      taxMinor,
      totalInclusiveMinor: taxableMinor + taxMinor,
      dependencies: deps,
      labelledDemo: true,
      notes,
      launchMarket,
    }
  }

  notes.push("Zero-rated export framing (demo) — confirm per market")
  return {
    treatment: "zero_rated_export",
    collector: "none",
    taxableMinor,
    lines: [],
    taxMinor: 0,
    totalInclusiveMinor: taxableMinor,
    dependencies: deps,
    labelledDemo: true,
    notes,
    launchMarket: "other",
  }
}

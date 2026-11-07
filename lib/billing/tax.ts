/**
 * Platform subscription tax adapter (CFO D01 — DEMO/STUB labelled).
 *
 * Deskulpt Inc is Canadian; no Indian entity.
 * Tax is driven by customer location + business vs consumer.
 * When MoR collects tax, this adapter steps aside.
 *
 * NOT live tax advice. India B2C OIDAR requires Indian GST registration (flagged dependency).
 */

export type CustomerKind = "business" | "consumer"

export type TaxCollector = "platform" | "mor" | "customer_reverse_charge" | "none"

export type TaxTreatment =
  | "in_b2b_reverse_charge"
  | "in_b2c_oidar"
  | "ca_gst_hst"
  | "zero_rated_export"
  | "mor_collects"
  | "blocked_missing_registration"
  | "unknown"

export type TaxCustomer = {
  /** ISO 3166-1 alpha-2 */
  country: string
  /** Subdivision: IN state / CA province code (e.g. ON, BC, MH) */
  region?: string | null
  kind: CustomerKind
  /** India GSTIN or CA business number when business */
  taxId?: string | null
  /** When true, MoR (e.g. Dodo) collects tax — platform adapter yields */
  morCollectsTax?: boolean
}

export type TaxLine = {
  code: string
  label: string
  rateBps: number
  amountMinor: number
}

export type TaxQuote = {
  treatment: TaxTreatment
  collector: TaxCollector
  /** Exclusive taxable base (same minor units as input) */
  taxableMinor: number
  lines: TaxLine[]
  taxMinor: number
  totalInclusiveMinor: number
  /** Human-readable blockers / dependencies (never silent) */
  dependencies: string[]
  labelledDemo: true
  notes: string[]
}

/** Canada GST/HST by province (demo rates — replace with live tables at go-live). */
export const CA_GST_HST_BPS: Record<string, number> = {
  AB: 500, // GST 5%
  BC: 500, // GST 5% (+ PST separate; not modelled here)
  MB: 500,
  NB: 1500, // HST 15%
  NL: 1500,
  NS: 1500,
  NT: 500,
  NU: 500,
  ON: 1300, // HST 13%
  PE: 1500,
  QC: 500, // GST 5% (+ QST separate; not modelled here)
  SK: 500,
  YT: 500,
}

export const IN_GST_BPS = 1800 // OIDAR display rate when platform may collect (demo)

/** Env flag: Indian GST registration present for OIDAR B2C. Default false. */
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

/**
 * Resolve tax on a platform SaaS subtotal (exclusive minor units).
 * Pure function — no I/O. DEMO labelled always.
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
  const notes: string[] = ["DEMO/STUB tax adapter — not live rates until D10 go-live gate"]

  if (input.customer.morCollectsTax) {
    return {
      treatment: "mor_collects",
      collector: "mor",
      taxableMinor,
      lines: [],
      taxMinor: 0,
      totalInclusiveMinor: taxableMinor,
      dependencies: [],
      labelledDemo: true,
      notes: [...notes, "MoR collects tax — Easy Rental tax adapter stepped aside"],
    }
  }

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
    }
  }

  // India
  if (country === "IN") {
    const isBiz = input.customer.kind === "business" && hasBusinessTaxId(input.customer.taxId)
    if (isBiz) {
      notes.push("India B2B reverse charge — platform does not collect Indian GST on SaaS")
      return {
        treatment: "in_b2b_reverse_charge",
        collector: "customer_reverse_charge",
        taxableMinor,
        lines: [],
        taxMinor: 0,
        totalInclusiveMinor: taxableMinor,
        dependencies: [],
        labelledDemo: true,
        notes,
      }
    }

    // B2C / unregistered → OIDAR
    if (!hasIndianGstRegistration()) {
      deps.push(
        "India B2C OIDAR requires Indian GST registration (Deskulpt Inc has no Indian entity) — blocked for live money",
      )
      return {
        treatment: "blocked_missing_registration",
        collector: "none",
        taxableMinor,
        lines: [],
        taxMinor: 0,
        totalInclusiveMinor: taxableMinor,
        dependencies: deps,
        labelledDemo: true,
        notes: [...notes, "Prefer MoR-as-seller (Dodo) for India until registration resolved"],
      }
    }

    const taxMinor = Math.round((taxableMinor * IN_GST_BPS) / 10_000)
    return {
      treatment: "in_b2c_oidar",
      collector: "platform",
      taxableMinor,
      lines: [
        {
          code: "IN_GST_OIDAR",
          label: "India GST (OIDAR demo 18%)",
          rateBps: IN_GST_BPS,
          amountMinor: taxMinor,
        },
      ],
      taxMinor,
      totalInclusiveMinor: taxableMinor + taxMinor,
      dependencies: deps,
      labelledDemo: true,
      notes: [...notes, "OIDAR path — confirm place-of-supply with India tax specialist (P0)"],
    }
  }

  // Canada
  if (country === "CA") {
    const bps = CA_GST_HST_BPS[region] ?? 500
    const taxMinor = Math.round((taxableMinor * bps) / 10_000)
    const label =
      bps >= 1300 ? `GST/HST (${(bps / 100).toFixed(0)}%)` : `GST (${(bps / 100).toFixed(0)}%)`
    if (!region) deps.push("CA province recommended for accurate HST; defaulted GST 5%")
    notes.push("PST/QST not modelled in this stub — expand at go-live")
    return {
      treatment: "ca_gst_hst",
      collector: "platform",
      taxableMinor,
      lines: [
        {
          code: `CA_GST_HST_${region || "DEFAULT"}`,
          label,
          rateBps: bps,
          amountMinor: taxMinor,
        },
      ],
      taxMinor,
      totalInclusiveMinor: taxableMinor + taxMinor,
      dependencies: deps,
      labelledDemo: true,
      notes,
    }
  }

  // Other countries — treat as zero-rated export from CA seller (demo framing)
  notes.push("Zero-rated export framing (demo) — confirm with counsel per market")
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
  }
}

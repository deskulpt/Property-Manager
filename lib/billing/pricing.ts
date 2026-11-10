/**
 * Platform billing quote math (CFO D01 — graduated volume, no-stack discounts).
 * Amounts in INR paise (₹1 = 100) for catalogue. Pure functions — no I/O.
 *
 * Tax: prefer `lib/billing/tax.ts` with customer location. Legacy `GST_BPS` is an
 * India catalogue display helper only — not blanket live GST.
 */

import {
  quoteSubscriptionTax,
  type TaxCustomer,
  type TaxQuote,
} from "@/lib/billing/tax"
import { featureGate } from "@/lib/billing/go-live-gate"
import { computeCountryTax } from "@/lib/markets/tax-adapters"

export type BillableSegment = "homes" | "retail_office" | "industrial"

export type BillingCadence = "monthly" | "annual"

/** Map listing segment → billable meter. */
export function billableSegmentFromListing(
  segment: "warehouse" | "commercial" | "residential" | string,
): BillableSegment {
  if (segment === "residential") return "homes"
  if (segment === "commercial") return "retail_office"
  return "industrial"
}

export const SEGMENT_LABEL: Record<BillableSegment, string> = {
  homes: "Homes",
  retail_office: "Retail & Office",
  industrial: "Industrial",
}

/** Standard monthly per-unit prices (exclusive of tax), paise. */
export const STANDARD_MONTHLY_PAISE: Record<BillableSegment, number> = {
  homes: 299_00,
  retail_office: 699_00,
  industrial: 1_999_00,
}

/** Launch-sale monthly per-unit prices (exclusive of tax), paise. */
export const SALE_MONTHLY_PAISE: Record<BillableSegment, number> = {
  homes: 149_00,
  retail_office: 349_00,
  industrial: 999_00,
}

/** @deprecated India catalogue display helper only — use lib/billing/tax.ts for invoices. */
export const GST_BPS = 1800
export const ANNUAL_MULTIPLIER = 10 // annual prepay = 10 × monthly (deferred revenue)
export const FREE_PLAN_MAX_UNITS = 1
export const SALE_PAYING_ACCOUNT_CAP = 500

/**
 * Minimum net price floor vs standard (bps). Sale ≈ 50% → floor 5000.
 * Enforced when exclusive discount paths would otherwise go lower.
 */
export const MIN_NET_PRICE_BPS = 5000

/** Sale window: 1 Dec 2026 00:00 IST → 31 Mar 2027 23:59:59.999 IST */
export const SALE_START_UTC = Date.parse("2026-11-30T18:30:00.000Z")
export const SALE_END_UTC = Date.parse("2027-03-31T18:29:59.999Z")
export const STANDARD_FROM_LABEL = "Standard price (from 1 Apr 2027)"

export type UnitMix = { segment: BillableSegment; count: number }

export type QuoteLine = {
  segment: BillableSegment
  label: string
  count: number
  unitStandardPaise: number
  unitChargedPaise: number
  lineStandardPaise: number
  lineChargedPaise: number
}

export type PricingPath = "sale" | "volume" | "standard" | "free" | "enterprise_quote" | "affiliate"

export type PricingQuote = {
  cadence: BillingCadence
  units: number
  lines: QuoteLine[]
  /** Exclusive of tax */
  standardSubtotalPaise: number
  chargedSubtotalPaise: number
  /** @deprecated Prefer taxQuote.taxMinor — kept for checkout UI compat */
  gstPaise: number
  taxQuote: TaxQuote | null
  /** Inclusive of tax when tax applied */
  totalInclusivePaise: number
  savingsPaise: number
  pricingPath: PricingPath
  /** Top graduated band reached (display); not all-units %. */
  volumeDiscountPct: 0 | 15 | 25
  saleEligible: boolean
  saleActive: boolean
  strikeStandard: boolean
  standardFromLabel: string
  lockedUntilIso: string | null
  /** Annual prepay → deferred revenue stub */
  deferredRevenue: {
    prepaidPaise: number
    monthlyRecognitionPaise: number
    months: number
  } | null
  discountsStacked: false
}

/** Self-serve volume caps at 50 units; above that is sales-led (D01). */
export const ENTERPRISE_QUOTE_MIN_UNITS = 51

/** Graduated volume bands — discount applies only to units inside the band. */
export const GRADUATED_VOLUME_TIERS: ReadonlyArray<{
  fromUnit: number
  toUnit: number
  discountPct: 0 | 15 | 25
}> = [
  { fromUnit: 1, toUnit: 5, discountPct: 0 },
  { fromUnit: 6, toUnit: 20, discountPct: 15 },
  { fromUnit: 21, toUnit: 50, discountPct: 25 },
]

export function requiresEnterpriseQuote(totalUnits: number): boolean {
  return totalUnits >= ENTERPRISE_QUOTE_MIN_UNITS
}

/**
 * Top graduated band for display. Not an all-units repricing percent.
 * Returns 0 for 1–5 and for >50 (enterprise quote).
 */
export function volumeDiscountPct(totalUnits: number): 0 | 15 | 25 {
  if (requiresEnterpriseQuote(totalUnits)) return 0
  if (totalUnits >= 21) return 25
  if (totalUnits >= 6) return 15
  return 0
}

export function isSaleWindow(nowMs: number): boolean {
  return nowMs >= SALE_START_UTC && nowMs <= SALE_END_UTC
}

export function isSaleActive(nowMs: number, payingAccountCount: number): boolean {
  return isSaleWindow(nowMs) && payingAccountCount < SALE_PAYING_ACCOUNT_CAP
}

export function applyBps(amountPaise: number, bps: number): number {
  return Math.round((amountPaise * bps) / 10_000)
}

function cadenceFactor(cadence: BillingCadence): number {
  return cadence === "annual" ? ANNUAL_MULTIPLIER : 1
}

function normalizeMix(mix: UnitMix[]): UnitMix[] {
  const map = new Map<BillableSegment, number>()
  for (const row of mix) {
    const n = Math.max(0, Math.floor(row.count))
    if (n <= 0) continue
    map.set(row.segment, (map.get(row.segment) ?? 0) + n)
  }
  return (["homes", "retail_office", "industrial"] as BillableSegment[])
    .filter((s) => (map.get(s) ?? 0) > 0)
    .map((segment) => ({ segment, count: map.get(segment)! }))
}

function subtotalAtRates(
  mix: UnitMix[],
  rates: Record<BillableSegment, number>,
  cadence: BillingCadence,
): number {
  const factor = cadenceFactor(cadence)
  let sum = 0
  for (const row of mix) {
    sum += rates[row.segment] * row.count * factor
  }
  return sum
}

/**
 * Graduated volume subtotal: walk units in segment order, apply band % to each unit index.
 * CFO: not all-units repricing.
 */
export function graduatedVolumeSubtotalPaise(
  mix: UnitMix[],
  cadence: BillingCadence,
): { subtotalPaise: number; lines: QuoteLine[] } {
  const factor = cadenceFactor(cadence)
  const normalized = normalizeMix(mix)
  let unitIndex = 0
  let subtotalPaise = 0
  const lineAcc = new Map<
    BillableSegment,
    { count: number; lineStandard: number; lineCharged: number }
  >()

  for (const row of normalized) {
    const unitStandard = STANDARD_MONTHLY_PAISE[row.segment] * factor
    for (let i = 0; i < row.count; i++) {
      unitIndex += 1
      const tier =
        GRADUATED_VOLUME_TIERS.find((t) => unitIndex >= t.fromUnit && unitIndex <= t.toUnit) ??
        null
      const pct = tier?.discountPct ?? 0
      const charged = Math.round(unitStandard * (1 - pct / 100))
      subtotalPaise += charged
      const prev = lineAcc.get(row.segment) ?? { count: 0, lineStandard: 0, lineCharged: 0 }
      prev.count += 1
      prev.lineStandard += unitStandard
      prev.lineCharged += charged
      lineAcc.set(row.segment, prev)
    }
  }

  const lines: QuoteLine[] = normalized.map((row) => {
    const acc = lineAcc.get(row.segment)!
    return {
      segment: row.segment,
      label: SEGMENT_LABEL[row.segment],
      count: acc.count,
      unitStandardPaise: STANDARD_MONTHLY_PAISE[row.segment] * factor,
      unitChargedPaise: acc.count > 0 ? Math.round(acc.lineCharged / acc.count) : 0,
      lineStandardPaise: acc.lineStandard,
      lineChargedPaise: acc.lineCharged,
    }
  })

  return { subtotalPaise, lines }
}

/**
 * Min-net floor for non-catalogue paths (e.g. affiliate).
 * Sale / graduated volume / standard are exclusive catalogue paths and are not bumped.
 */
function enforceMinNet(
  standardPaise: number,
  chargedPaise: number,
  path: PricingPath,
): number {
  if (path === "sale" || path === "volume" || path === "standard" || path === "free" || path === "enterprise_quote") {
    return chargedPaise
  }
  const floor = applyBps(standardPaise, MIN_NET_PRICE_BPS)
  return Math.max(chargedPaise, floor)
}

function deferredForCadence(
  cadence: BillingCadence,
  prepaidPaise: number,
): PricingQuote["deferredRevenue"] {
  if (cadence !== "annual" || prepaidPaise <= 0) return null
  return {
    prepaidPaise,
    monthlyRecognitionPaise: Math.round(prepaidPaise / 12),
    months: 12,
  }
}

export type QuoteInput = {
  mix: UnitMix[]
  cadence: BillingCadence
  nowMs?: number
  payingAccountCount?: number
  lockedMonthlyPaise?: Partial<Record<BillableSegment, number>> | null
  priceLockUntilIso?: string | null
  /**
   * Optional affiliate % off standard (bps). Never stacks with sale/volume —
   * exclusive best path wins (D01 CFO). Affiliate program itself is inactive (D12).
   */
  affiliateDiscountBps?: number
  /**
   * When set, tax lines come from gated adapters (preferred for live invoices).
   * Without a customer, live tax is 0 — never invent fixed 18% GST on invoices.
   */
  taxCustomer?: TaxCustomer | null
  /**
   * Catalogue / marketing display only — may apply deprecated India GST_BPS helper.
   * Live checkout and invoices must omit this and pass taxCustomer instead.
   */
  catalogueDisplayGst?: boolean
}

/**
 * Live invoice tax: gated country adapters + per-feature evidence.
 * Never falls back to fixed 18% GST_BPS.
 */
export function quoteLiveInvoiceTax(input: {
  exclusiveMinor: number
  customer: TaxCustomer
}): TaxQuote {
  const exclusive = Math.max(0, Math.round(input.exclusiveMinor))
  const evidence = featureGate("live_invoice_tax")
  const country = (input.customer.country ?? "").trim().toUpperCase()
  const adapter = computeCountryTax({
    iso: country || "CA",
    taxableMinor: exclusive,
  })

  if (!evidence.allowed || !adapter.ok) {
    // Fail-closed: zero tax line + dependency notes (demo catalogue uses catalogueDisplayGst).
    const blocked = quoteSubscriptionTax({
      exclusiveMinor: exclusive,
      customer: { ...input.customer, stripeTaxEnabled: false },
    })
    return {
      ...blocked,
      taxMinor: 0,
      totalInclusiveMinor: exclusive,
      lines: [],
      dependencies: [
        ...blocked.dependencies,
        ...(evidence.allowed ? [] : evidence.blockers),
        adapter.ok ? "" : adapter.reason,
      ].filter(Boolean),
      notes: [
        ...blocked.notes,
        "Live invoice tax gated — adapters/evidence OFF; no fixed 18% GST applied",
      ],
    }
  }

  const base = quoteSubscriptionTax({
    exclusiveMinor: exclusive,
    customer: input.customer,
  })
  // Prefer adapter amount when flag-enabled; keep Stripe Tax treatment metadata.
  return {
    ...base,
    taxMinor: adapter.taxMinor,
    totalInclusiveMinor: exclusive + adapter.taxMinor,
    lines:
      adapter.taxMinor > 0
        ? [
            {
              code: `ADAPTER_${adapter.kind}`,
              label: adapter.label,
              rateBps:
                exclusive > 0
                  ? Math.round((adapter.taxMinor * 10_000) / exclusive)
                  : 0,
              amountMinor: adapter.taxMinor,
              calculatedBy: "stripe_tax_stub",
            },
          ]
        : [],
    notes: [
      ...base.notes,
      `Gated tax adapter ${adapter.kind} (registration ${adapter.taxRegistrationId ?? "n/a"})`,
    ],
  }
}

function emptyTax(exclusive: number, customer: TaxCustomer | null | undefined): TaxQuote | null {
  if (!customer) return null
  return quoteLiveInvoiceTax({ exclusiveMinor: exclusive, customer })
}

function resolveGstPaise(
  chargedSubtotalPaise: number,
  taxQuote: TaxQuote | null,
  catalogueDisplayGst: boolean | undefined,
): number {
  if (taxQuote) return taxQuote.taxMinor
  // Catalogue/marketing helper only — never for live invoices.
  if (catalogueDisplayGst) return applyBps(chargedSubtotalPaise, GST_BPS)
  return 0
}

/**
 * Build a checkout quote.
 * Sale / graduated volume / affiliate cannot stack — exclusive best path.
 * Min net floor enforced. Annual = deferred revenue recognition stub.
 */
export function quotePlatformBilling(input: QuoteInput): PricingQuote {
  const mix = normalizeMix(input.mix)
  const units = mix.reduce((n, r) => n + r.count, 0)
  const cadence = input.cadence
  const nowMs = input.nowMs ?? Date.now()
  const paying = input.payingAccountCount ?? 0
  const saleActive = isSaleActive(nowMs, paying)
  const topVolPct = volumeDiscountPct(units)
  const factor = cadenceFactor(cadence)

  const baseEmpty = (path: PricingPath): PricingQuote => ({
    cadence,
    units,
    lines: [],
    standardSubtotalPaise: 0,
    chargedSubtotalPaise: 0,
    gstPaise: 0,
    taxQuote: emptyTax(0, input.taxCustomer),
    totalInclusivePaise: 0,
    savingsPaise: 0,
    pricingPath: path,
    volumeDiscountPct: 0,
    saleEligible: saleActive,
    saleActive,
    strikeStandard: false,
    standardFromLabel: STANDARD_FROM_LABEL,
    lockedUntilIso: input.priceLockUntilIso ?? null,
    deferredRevenue: null,
    discountsStacked: false,
  })

  if (units === 0) return baseEmpty("free")

  if (
    requiresEnterpriseQuote(units) &&
    !(input.lockedMonthlyPaise && Object.keys(input.lockedMonthlyPaise).length > 0)
  ) {
    const standardSubtotalPaise = subtotalAtRates(mix, STANDARD_MONTHLY_PAISE, cadence)
    const lines: QuoteLine[] = mix.map((row) => {
      const unitStandardPaise = STANDARD_MONTHLY_PAISE[row.segment] * factor
      return {
        segment: row.segment,
        label: SEGMENT_LABEL[row.segment],
        count: row.count,
        unitStandardPaise,
        unitChargedPaise: unitStandardPaise,
        lineStandardPaise: unitStandardPaise * row.count,
        lineChargedPaise: unitStandardPaise * row.count,
      }
    })
    return {
      cadence,
      units,
      lines,
      standardSubtotalPaise,
      chargedSubtotalPaise: 0,
      gstPaise: 0,
      taxQuote: emptyTax(0, input.taxCustomer),
      totalInclusivePaise: 0,
      savingsPaise: 0,
      pricingPath: "enterprise_quote",
      volumeDiscountPct: 0,
      saleEligible: saleActive,
      saleActive,
      strikeStandard: false,
      standardFromLabel: STANDARD_FROM_LABEL,
      lockedUntilIso: input.priceLockUntilIso ?? null,
      deferredRevenue: null,
      discountsStacked: false,
    }
  }

  const locked = input.lockedMonthlyPaise
  if (locked && Object.keys(locked).length > 0) {
    const rates: Record<BillableSegment, number> = { ...STANDARD_MONTHLY_PAISE }
    for (const s of Object.keys(locked) as BillableSegment[]) {
      if (locked[s] != null) rates[s] = locked[s]!
    }
    const standardSubtotalPaise = subtotalAtRates(mix, STANDARD_MONTHLY_PAISE, cadence)
    const chargedSubtotalPaise = subtotalAtRates(mix, rates, cadence)
    const taxQuote = emptyTax(chargedSubtotalPaise, input.taxCustomer)
    const gstPaise = resolveGstPaise(
      chargedSubtotalPaise,
      taxQuote,
      input.catalogueDisplayGst,
    )
    const lines: QuoteLine[] = mix.map((row) => {
      const unitStandardPaise = STANDARD_MONTHLY_PAISE[row.segment] * factor
      const unitChargedPaise = rates[row.segment] * factor
      return {
        segment: row.segment,
        label: SEGMENT_LABEL[row.segment],
        count: row.count,
        unitStandardPaise,
        unitChargedPaise,
        lineStandardPaise: unitStandardPaise * row.count,
        lineChargedPaise: unitChargedPaise * row.count,
      }
    })
    return {
      cadence,
      units,
      lines,
      standardSubtotalPaise,
      chargedSubtotalPaise,
      gstPaise,
      taxQuote,
      totalInclusivePaise: chargedSubtotalPaise + gstPaise,
      savingsPaise: Math.max(0, standardSubtotalPaise - chargedSubtotalPaise),
      pricingPath: "standard",
      volumeDiscountPct: 0,
      saleEligible: saleActive,
      saleActive,
      strikeStandard: chargedSubtotalPaise < standardSubtotalPaise,
      standardFromLabel: STANDARD_FROM_LABEL,
      lockedUntilIso: input.priceLockUntilIso ?? null,
      deferredRevenue: deferredForCadence(cadence, chargedSubtotalPaise),
      discountsStacked: false,
    }
  }

  const standardSubtotalPaise = subtotalAtRates(mix, STANDARD_MONTHLY_PAISE, cadence)
  const graduated = graduatedVolumeSubtotalPaise(mix, cadence)
  const saleSubtotalPaise = saleActive
    ? subtotalAtRates(mix, SALE_MONTHLY_PAISE, cadence)
    : standardSubtotalPaise
  const affiliateBps = Math.max(0, Math.min(10_000, input.affiliateDiscountBps ?? 0))
  const affiliateSubtotalPaise =
    affiliateBps > 0
      ? enforceMinNet(
          standardSubtotalPaise,
          applyBps(standardSubtotalPaise, 10_000 - affiliateBps),
          "affiliate",
        )
      : standardSubtotalPaise

  type Candidate = { path: PricingPath; subtotal: number; lines: QuoteLine[] }
  const candidates: Candidate[] = [
    {
      path: "standard",
      subtotal: standardSubtotalPaise,
      lines: mix.map((row) => {
        const unitStandardPaise = STANDARD_MONTHLY_PAISE[row.segment] * factor
        return {
          segment: row.segment,
          label: SEGMENT_LABEL[row.segment],
          count: row.count,
          unitStandardPaise,
          unitChargedPaise: unitStandardPaise,
          lineStandardPaise: unitStandardPaise * row.count,
          lineChargedPaise: unitStandardPaise * row.count,
        }
      }),
    },
  ]

  if (saleActive && saleSubtotalPaise < standardSubtotalPaise) {
    candidates.push({
      path: "sale",
      subtotal: saleSubtotalPaise,
      lines: mix.map((row) => {
        const unitStandardPaise = STANDARD_MONTHLY_PAISE[row.segment] * factor
        const unitChargedPaise = SALE_MONTHLY_PAISE[row.segment] * factor
        return {
          segment: row.segment,
          label: SEGMENT_LABEL[row.segment],
          count: row.count,
          unitStandardPaise,
          unitChargedPaise,
          lineStandardPaise: unitStandardPaise * row.count,
          lineChargedPaise: unitChargedPaise * row.count,
        }
      }),
    })
  }

  if (graduated.subtotalPaise < standardSubtotalPaise) {
    candidates.push({
      path: "volume",
      subtotal: graduated.subtotalPaise,
      lines: graduated.lines,
    })
  }

  if (affiliateBps > 0 && affiliateSubtotalPaise < standardSubtotalPaise) {
    candidates.push({
      path: "affiliate",
      subtotal: affiliateSubtotalPaise,
      lines: mix.map((row) => {
        const unitStandardPaise = STANDARD_MONTHLY_PAISE[row.segment] * factor
        const lineStandard = unitStandardPaise * row.count
        const lineCharged = Math.round(
          (affiliateSubtotalPaise * lineStandard) / standardSubtotalPaise,
        )
        return {
          segment: row.segment,
          label: SEGMENT_LABEL[row.segment],
          count: row.count,
          unitStandardPaise,
          unitChargedPaise: row.count > 0 ? Math.round(lineCharged / row.count) : 0,
          lineStandardPaise: lineStandard,
          lineChargedPaise: lineCharged,
        }
      }),
    })
  }

  // Exclusive best path (lowest subtotal) — no stacking
  candidates.sort((a, b) => a.subtotal - b.subtotal)
  const best = candidates[0]!
  const chargedSubtotalPaise = enforceMinNet(standardSubtotalPaise, best.subtotal, best.path)
  const taxQuote = emptyTax(chargedSubtotalPaise, input.taxCustomer)
  const gstPaise = resolveGstPaise(
    chargedSubtotalPaise,
    taxQuote,
    input.catalogueDisplayGst,
  )

  return {
    cadence,
    units,
    lines: best.lines,
    standardSubtotalPaise,
    chargedSubtotalPaise,
    gstPaise,
    taxQuote,
    totalInclusivePaise: chargedSubtotalPaise + gstPaise,
    savingsPaise: Math.max(0, standardSubtotalPaise - chargedSubtotalPaise),
    pricingPath: best.path,
    volumeDiscountPct: best.path === "volume" ? topVolPct : 0,
    saleEligible: saleActive,
    saleActive,
    strikeStandard: chargedSubtotalPaise < standardSubtotalPaise,
    standardFromLabel: STANDARD_FROM_LABEL,
    lockedUntilIso: null,
    deferredRevenue: deferredForCadence(cadence, chargedSubtotalPaise),
    discountsStacked: false,
  }
}

/** Rates to lock for 12 months from join (monthly exclusive paise). */
export function lockRatesFromQuote(quote: PricingQuote): Record<BillableSegment, number> {
  const out: Record<BillableSegment, number> = { ...STANDARD_MONTHLY_PAISE }
  const factor = cadenceFactor(quote.cadence)
  for (const line of quote.lines) {
    out[line.segment] = Math.round(line.unitChargedPaise / factor)
  }
  if (quote.pricingPath === "sale") {
    return { ...SALE_MONTHLY_PAISE }
  }
  return out
}

export function priceLockUntilIso(fromMs: number): string {
  const d = new Date(fromMs)
  d.setUTCFullYear(d.getUTCFullYear() + 1)
  return d.toISOString()
}

export function formatInrPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(paise / 100))
}

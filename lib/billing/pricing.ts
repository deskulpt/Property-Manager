/**
 * Platform billing quote math (Aloke launch pricing).
 * Amounts in INR paise (₹1 = 100). Pure functions — no I/O.
 */

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

/** Standard monthly per-unit prices (exclusive of GST), paise. */
export const STANDARD_MONTHLY_PAISE: Record<BillableSegment, number> = {
  homes: 299_00,
  retail_office: 699_00,
  industrial: 1_999_00,
}

/** Launch-sale monthly per-unit prices (exclusive of GST), paise. */
export const SALE_MONTHLY_PAISE: Record<BillableSegment, number> = {
  homes: 149_00,
  retail_office: 349_00,
  industrial: 999_00,
}

export const GST_BPS = 1800 // 18%
export const ANNUAL_MULTIPLIER = 10 // annual = 10 × monthly
export const FREE_PLAN_MAX_UNITS = 1
export const SALE_PAYING_ACCOUNT_CAP = 500

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

export type PricingQuote = {
  cadence: BillingCadence
  units: number
  lines: QuoteLine[]
  /** Exclusive of GST */
  standardSubtotalPaise: number
  chargedSubtotalPaise: number
  gstPaise: number
  /** Inclusive of GST — show at checkout */
  totalInclusivePaise: number
  savingsPaise: number
  pricingPath: "sale" | "volume" | "standard" | "free"
  volumeDiscountPct: 0 | 15 | 25
  saleEligible: boolean
  saleActive: boolean
  strikeStandard: boolean
  standardFromLabel: string
  lockedUntilIso: string | null
}

export function volumeDiscountPct(totalUnits: number): 0 | 15 | 25 {
  if (totalUnits >= 21 && totalUnits <= 50) return 25
  if (totalUnits >= 6 && totalUnits <= 20) return 15
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

export type QuoteInput = {
  mix: UnitMix[]
  cadence: BillingCadence
  nowMs?: number
  payingAccountCount?: number
  /** When set, use these locked monthly rates (paise) instead of live catalogue. */
  lockedMonthlyPaise?: Partial<Record<BillableSegment, number>> | null
  /** ISO date of lock end; informational on quote. */
  priceLockUntilIso?: string | null
}

/**
 * Build a checkout quote. Sale and volume do not stack — whichever saves more wins.
 * GST 18% added; totalInclusivePaise is what checkout shows.
 */
export function quotePlatformBilling(input: QuoteInput): PricingQuote {
  const mix = normalizeMix(input.mix)
  const units = mix.reduce((n, r) => n + r.count, 0)
  const cadence = input.cadence
  const nowMs = input.nowMs ?? Date.now()
  const paying = input.payingAccountCount ?? 0
  const saleActive = isSaleActive(nowMs, paying)
  const volPct = volumeDiscountPct(units)
  const factor = cadenceFactor(cadence)

  if (units === 0) {
    return {
      cadence,
      units: 0,
      lines: [],
      standardSubtotalPaise: 0,
      chargedSubtotalPaise: 0,
      gstPaise: 0,
      totalInclusivePaise: 0,
      savingsPaise: 0,
      pricingPath: "free",
      volumeDiscountPct: 0,
      saleEligible: saleActive,
      saleActive,
      strikeStandard: false,
      standardFromLabel: STANDARD_FROM_LABEL,
      lockedUntilIso: input.priceLockUntilIso ?? null,
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
    const gstPaise = applyBps(chargedSubtotalPaise, GST_BPS)
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
      totalInclusivePaise: chargedSubtotalPaise + gstPaise,
      savingsPaise: Math.max(0, standardSubtotalPaise - chargedSubtotalPaise),
      pricingPath: "standard",
      volumeDiscountPct: 0,
      saleEligible: saleActive,
      saleActive,
      strikeStandard: chargedSubtotalPaise < standardSubtotalPaise,
      standardFromLabel: STANDARD_FROM_LABEL,
      lockedUntilIso: input.priceLockUntilIso ?? null,
    }
  }

  const standardSubtotalPaise = subtotalAtRates(mix, STANDARD_MONTHLY_PAISE, cadence)
  const volumeSubtotalPaise = Math.round(standardSubtotalPaise * (1 - volPct / 100))
  const saleSubtotalPaise = saleActive
    ? subtotalAtRates(mix, SALE_MONTHLY_PAISE, cadence)
    : standardSubtotalPaise

  let pricingPath: PricingQuote["pricingPath"] = "standard"
  let chargedSubtotalPaise = standardSubtotalPaise
  let unitRates = { ...STANDARD_MONTHLY_PAISE }

  if (saleActive && saleSubtotalPaise <= volumeSubtotalPaise && saleSubtotalPaise < standardSubtotalPaise) {
    pricingPath = "sale"
    chargedSubtotalPaise = saleSubtotalPaise
    unitRates = { ...SALE_MONTHLY_PAISE }
  } else if (volPct > 0 && volumeSubtotalPaise < standardSubtotalPaise) {
    pricingPath = "volume"
    chargedSubtotalPaise = volumeSubtotalPaise
    // volume is % off standard — keep standard unit rates for display, line total discounted proportionally
    unitRates = { ...STANDARD_MONTHLY_PAISE }
  }

  const gstPaise = applyBps(chargedSubtotalPaise, GST_BPS)
  const lines: QuoteLine[] = mix.map((row) => {
    const unitStandardPaise = STANDARD_MONTHLY_PAISE[row.segment] * factor
    let unitChargedPaise = unitRates[row.segment] * factor
    let lineChargedPaise = unitChargedPaise * row.count
    if (pricingPath === "volume") {
      lineChargedPaise = Math.round(unitStandardPaise * row.count * (1 - volPct / 100))
      unitChargedPaise = row.count > 0 ? Math.round(lineChargedPaise / row.count) : unitChargedPaise
    }
    return {
      segment: row.segment,
      label: SEGMENT_LABEL[row.segment],
      count: row.count,
      unitStandardPaise,
      unitChargedPaise,
      lineStandardPaise: unitStandardPaise * row.count,
      lineChargedPaise,
    }
  })

  return {
    cadence,
    units,
    lines,
    standardSubtotalPaise,
    chargedSubtotalPaise,
    gstPaise,
    totalInclusivePaise: chargedSubtotalPaise + gstPaise,
    savingsPaise: Math.max(0, standardSubtotalPaise - chargedSubtotalPaise),
    pricingPath,
    volumeDiscountPct: pricingPath === "volume" ? volPct : 0,
    saleEligible: saleActive,
    saleActive,
    strikeStandard: chargedSubtotalPaise < standardSubtotalPaise,
    standardFromLabel: STANDARD_FROM_LABEL,
    lockedUntilIso: null,
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
  if (quote.pricingPath === "volume") {
    const pct = quote.volumeDiscountPct
    for (const s of Object.keys(STANDARD_MONTHLY_PAISE) as BillableSegment[]) {
      out[s] = Math.round(STANDARD_MONTHLY_PAISE[s] * (1 - pct / 100))
    }
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

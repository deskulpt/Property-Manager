import { getRust } from "@/lib/rust/load"

/** Late fee = max(flat, round(rent * bps / 10000)). */
export function lateFeeCents(
  rentCents: number,
  rule: { flatCents: number; percentBps: number },
): number {
  const rust = getRust()
  if (rust) {
    return rust.late_fee_cents(rentCents, rule.flatCents, rule.percentBps)
  }
  const percent = Math.round((rentCents * rule.percentBps) / 10000)
  return Math.max(rule.flatCents, percent)
}

export function gstCents(taxableMinor: number, gstRateBps: number): number {
  const rust = getRust()
  if (rust) return rust.gst_cents(taxableMinor, gstRateBps)
  return Math.round((taxableMinor * gstRateBps) / 10000)
}

/**
 * Monthly rent in minor units. `ratePsf` is major currency per SF.
 * Integer path: rate milli × area × minorPerMajor / 1000.
 */
export function monthlyRentCents(
  ratePsf: number,
  area: number,
  opts: { currencyMinorPerMajor: number; ratePeriod: "month" | "year" },
): number {
  const rust = getRust()
  const rateMilli = Math.round(ratePsf * 1000)
  const areaInt = Math.round(area)
  if (rust) {
    return rust.monthly_rent_cents(
      rateMilli,
      areaInt,
      opts.currencyMinorPerMajor,
      opts.ratePeriod === "month",
    )
  }
  const monthlyMajor =
    opts.ratePeriod === "month" ? ratePsf * area : (ratePsf * area) / 12
  return Math.round(monthlyMajor * opts.currencyMinorPerMajor)
}

export function fxMicros(currency: string): number {
  const rust = getRust()
  if (rust) return rust.fx_micros(currency)
  const table: Record<string, number> = {
    INR: 1_000_000,
    USD: 12_000,
    CAD: 16_000,
    GBP: 9_500,
  }
  return table[currency] ?? 1_000_000
}

/** Display-currency minor units from INR paisa (integer FX). */
export function convertFromInrMinorDisplayCents(inrMinor: number, currency: string): number {
  const rust = getRust()
  const micros = fxMicros(currency)
  if (rust) return rust.convert_from_inr_minor_display_cents(inrMinor, micros)
  return Math.round((inrMinor * micros) / 1_000_000)
}

/** Major units of display currency (may be fractional for Intl formatting). */
export function convertFromInrMinorMajor(inrMinor: number, currency: string): number {
  const rust = getRust()
  const micros = fxMicros(currency)
  if (rust) {
    return rust.convert_from_inr_minor_major_milli(inrMinor, micros) / 1000
  }
  return (inrMinor / 100) * (micros / 1_000_000)
}

export function normalizeSlug(input: string): string {
  const rust = getRust()
  if (rust) {
    return rust.slugifyOrg?.(input) ?? rust.normalize_slug(input)
  }
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
  return base || "org"
}

export function isValidTenantId(id: string): boolean {
  const rust = getRust()
  if (rust?.isValidTenantId) return rust.isValidTenantId(id)
  return /^t_[a-z0-9_]{1,62}$/.test(id)
}

export function isValidSlug(slug: string): boolean {
  const rust = getRust()
  if (rust?.isValidSlug) return rust.isValidSlug(slug)
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 64
}

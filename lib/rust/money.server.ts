import "server-only"
import { getRust } from "@/lib/rust/load.node"
import * as fallback from "@/lib/rust/money-fallback"

/** Server-only WASM-accelerated money (falls back to TS). */

export function lateFeeCents(
  rentCents: number,
  rule: { flatCents: number; percentBps: number },
): number {
  const rust = getRust()
  if (rust) return rust.late_fee_cents(rentCents, rule.flatCents, rule.percentBps)
  return fallback.lateFeeCentsFallback(rentCents, rule)
}

export function gstCents(taxableMinor: number, gstRateBps: number): number {
  const rust = getRust()
  if (rust) return rust.gst_cents(taxableMinor, gstRateBps)
  return fallback.gstCentsFallback(taxableMinor, gstRateBps)
}

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
  return fallback.monthlyRentCentsFallback(ratePsf, area, opts)
}

export function fxMicros(currency: string): number {
  const rust = getRust()
  if (rust) return rust.fx_micros(currency)
  return fallback.fxMicrosFallback(currency)
}

export function convertFromInrMinorDisplayCents(inrMinor: number, currency: string): number {
  const rust = getRust()
  const micros = fxMicros(currency)
  if (rust) return rust.convert_from_inr_minor_display_cents(inrMinor, micros)
  return fallback.convertFromInrMinorDisplayCentsFallback(inrMinor, currency)
}

export function convertFromInrMinorMajor(inrMinor: number, currency: string): number {
  const rust = getRust()
  const micros = fxMicros(currency)
  if (rust) return rust.convert_from_inr_minor_major_milli(inrMinor, micros) / 1000
  return fallback.convertFromInrMinorMajorFallback(inrMinor, currency)
}

export function normalizeSlug(input: string): string {
  const rust = getRust()
  if (rust) return rust.slugifyOrg?.(input) ?? rust.normalize_slug(input)
  return fallback.normalizeSlugFallback(input)
}

export function isValidTenantId(id: string): boolean {
  const rust = getRust()
  if (rust?.isValidTenantId) return rust.isValidTenantId(id)
  return fallback.isValidTenantIdFallback(id)
}

export function isValidSlug(slug: string): boolean {
  const rust = getRust()
  if (rust?.isValidSlug) return rust.isValidSlug(slug)
  return fallback.isValidSlugFallback(slug)
}

/**
 * Pure TypeScript money/slug helpers — safe for client components.
 * Keep in sync with easyrent-wasm; parity covered by test/rust-core-parity.test.ts.
 */

/** Late fee = max(flat, round(rent * bps / 10000)). */
export function lateFeeCentsFallback(
  rentCents: number,
  rule: { flatCents: number; percentBps: number },
): number {
  const percent = Math.round((rentCents * rule.percentBps) / 10000)
  return Math.max(rule.flatCents, percent)
}

export function gstCentsFallback(taxableMinor: number, gstRateBps: number): number {
  return Math.round((taxableMinor * gstRateBps) / 10000)
}

export function monthlyRentCentsFallback(
  ratePsf: number,
  area: number,
  opts: { currencyMinorPerMajor: number; ratePeriod: "month" | "year" },
): number {
  const monthlyMajor =
    opts.ratePeriod === "month" ? ratePsf * area : (ratePsf * area) / 12
  return Math.round(monthlyMajor * opts.currencyMinorPerMajor)
}

export function fxMicrosFallback(currency: string): number {
  const table: Record<string, number> = {
    INR: 1_000_000,
    USD: 12_000,
    CAD: 16_000,
    GBP: 9_500,
  }
  return table[currency] ?? 1_000_000
}

export function convertFromInrMinorDisplayCentsFallback(
  inrMinor: number,
  currency: string,
): number {
  const micros = fxMicrosFallback(currency)
  return Math.round((inrMinor * micros) / 1_000_000)
}

export function convertFromInrMinorMajorFallback(inrMinor: number, currency: string): number {
  const micros = fxMicrosFallback(currency)
  return (inrMinor / 100) * (micros / 1_000_000)
}

export function normalizeSlugFallback(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
  return base || "org"
}

export function isValidTenantIdFallback(id: string): boolean {
  return /^t_[a-z0-9_]{1,62}$/.test(id)
}

export function isValidSlugFallback(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 64
}

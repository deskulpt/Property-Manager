/**
 * Rough rent estimator for industrial / warehouse bays (demo heuristic).
 * Not a valuation — used by /tools/rent-estimate.
 * India: INR by PIN prefix. Canada: CAD by postal FSA first letter.
 */

import type { MarketId } from "@/lib/market"
import { formatMarketMoney } from "@/lib/market"

export type AmenityKey =
  | "dock"
  | "drive_in"
  | "power_3ph"
  | "clear_height_28"
  | "yard"
  | "fire_noc"
  | "office_cabin"

export const AMENITY_OPTIONS: { key: AmenityKey; label: string; upliftPct: number }[] = [
  { key: "dock", label: "Loading dock(s)", upliftPct: 4 },
  { key: "drive_in", label: "Drive-in door", upliftPct: 3 },
  { key: "power_3ph", label: "3-phase power", upliftPct: 5 },
  { key: "clear_height_28", label: "Clear height ≥ 28 ft", upliftPct: 6 },
  { key: "yard", label: "Dedicated yard / trailer park", upliftPct: 4 },
  { key: "fire_noc", label: "Fire NOC / code ready", upliftPct: 2 },
  { key: "office_cabin", label: "Attached office cabin", upliftPct: 3 },
]

/** Base ₹/SF/month by first 3 digits of PIN (demo corridors). */
const PIN_BASE_IN: { prefix: string; label: string; ratePsf: number }[] = [
  { prefix: "400", label: "Mumbai / MMR", ratePsf: 48 },
  { prefix: "401", label: "Thane / Mira", ratePsf: 42 },
  { prefix: "421", label: "Bhiwandi logistics", ratePsf: 28 },
  { prefix: "411", label: "Pune / Hinjewadi", ratePsf: 36 },
  { prefix: "560", label: "Bengaluru", ratePsf: 40 },
  { prefix: "602", label: "Chennai / SIPCOT", ratePsf: 32 },
  { prefix: "122", label: "Gurugram", ratePsf: 45 },
  { prefix: "201", label: "Noida / Ghaziabad", ratePsf: 38 },
]

/** Base CA$/SF/month by FSA first letter (demo corridors). */
const POSTAL_BASE_CA: { prefix: string; label: string; ratePsf: number }[] = [
  { prefix: "M", label: "Toronto core / GTA", ratePsf: 18 },
  { prefix: "L", label: "Mississauga / Peel logistics", ratePsf: 14 },
  { prefix: "V", label: "Metro Vancouver / Fraser", ratePsf: 16 },
  { prefix: "T", label: "Calgary / Alberta industrial", ratePsf: 12 },
  { prefix: "H", label: "Montreal / Laval", ratePsf: 13 },
  { prefix: "K", label: "Ottawa / Eastern Ontario", ratePsf: 11 },
  { prefix: "R", label: "Winnipeg / Prairies", ratePsf: 10 },
]

const DEFAULT_RATE_IN = 30
const DEFAULT_RATE_CA = 12

export type RentEstimateInput = {
  sqft: number
  pin: string
  amenities: AmenityKey[]
  marketId?: MarketId
}

export type RentEstimateResult = {
  corridorLabel: string
  baseRatePsf: number
  adjustedRatePsf: number
  monthlyLow: number
  monthlyMid: number
  monthlyHigh: number
  annualMid: number
  /** @deprecated alias for monthlyLow — India-era field name */
  monthlyLowInr: number
  monthlyMidInr: number
  monthlyHighInr: number
  annualMidInr: number
  upliftPct: number
  currency: string
  marketId: MarketId
  disclaimer: string
}

export function estimateRent(input: RentEstimateInput): RentEstimateResult | { error: string } {
  const marketId: MarketId = input.marketId ?? "IN"
  const sqft = Number(input.sqft)
  if (!Number.isFinite(sqft) || sqft < 500 || sqft > 500_000) {
    return { error: "Enter area between 500 and 500,000 SF." }
  }

  let corridorLabel: string
  let baseRatePsf: number

  if (marketId === "CA") {
    const compact = String(input.pin ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
    if (compact.length < 1) {
      return { error: "Enter a Canadian postal code (e.g. M5V 2T6)." }
    }
    const letter = compact[0]!
    const match =
      POSTAL_BASE_CA.find((row) => row.prefix === letter) ??
      ({ prefix: letter, label: "Canada C&I (generic)", ratePsf: DEFAULT_RATE_CA } as const)
    corridorLabel = match.label
    baseRatePsf = match.ratePsf
  } else {
    const pin = String(input.pin ?? "").replace(/\D/g, "")
    if (pin.length < 3) {
      return { error: "Enter at least the first 3 digits of an India PIN code." }
    }
    const match =
      PIN_BASE_IN.find((row) => pin.startsWith(row.prefix)) ??
      ({ prefix: pin.slice(0, 3), label: "India C&I (generic)", ratePsf: DEFAULT_RATE_IN } as const)
    corridorLabel = match.label
    baseRatePsf = match.ratePsf
  }

  const uniqueAmenities = [...new Set(input.amenities)]
  const upliftPct = uniqueAmenities.reduce((sum, key) => {
    const opt = AMENITY_OPTIONS.find((a) => a.key === key)
    return sum + (opt?.upliftPct ?? 0)
  }, 0)

  const adjustedRatePsf = baseRatePsf * (1 + upliftPct / 100)
  const mid = adjustedRatePsf * sqft
  const low = mid * 0.88
  const high = mid * 1.14
  const currency = marketId === "CA" ? "CAD" : "INR"

  const monthlyLow = Math.round(low)
  const monthlyMid = Math.round(mid)
  const monthlyHigh = Math.round(high)
  const annualMid = Math.round(mid * 12)

  return {
    corridorLabel,
    baseRatePsf,
    adjustedRatePsf: Math.round(adjustedRatePsf * 100) / 100,
    monthlyLow,
    monthlyMid,
    monthlyHigh,
    annualMid,
    monthlyLowInr: monthlyLow,
    monthlyMidInr: monthlyMid,
    monthlyHighInr: monthlyHigh,
    annualMidInr: annualMid,
    upliftPct,
    currency,
    marketId,
    disclaimer:
      marketId === "CA"
        ? "Estimate only — heuristic demo based on postal FSA letter corridors and amenities (CAD). Not an appraisal, offer, or binding quote. Provincial commercial leasing norms vary — confirm with the landlord and counsel."
        : "Estimate only — heuristic demo based on corridor PIN prefixes and amenities. Not an appraisal, offer, or binding quote. Confirm with the landlord before budgeting.",
  }
}

export function formatInr(amount: number) {
  return formatMarketMoney(amount, "IN")
}

export function formatEstimateMoney(amount: number, marketId: MarketId = "IN") {
  return formatMarketMoney(amount, marketId)
}

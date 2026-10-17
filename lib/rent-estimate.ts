/**
 * Rough INR rent estimator for industrial / warehouse bays (demo heuristic).
 * Not a valuation — used by /tools/rent-estimate.
 */

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
  { key: "fire_noc", label: "Fire NOC ready", upliftPct: 2 },
  { key: "office_cabin", label: "Attached office cabin", upliftPct: 3 },
]

/** Base ₹/SF/month by first 3 digits of PIN (demo corridors). */
const PIN_BASE: { prefix: string; label: string; ratePsf: number }[] = [
  { prefix: "400", label: "Mumbai / MMR", ratePsf: 48 },
  { prefix: "401", label: "Thane / Mira", ratePsf: 42 },
  { prefix: "421", label: "Bhiwandi logistics", ratePsf: 28 },
  { prefix: "411", label: "Pune / Hinjewadi", ratePsf: 36 },
  { prefix: "560", label: "Bengaluru", ratePsf: 40 },
  { prefix: "602", label: "Chennai / SIPCOT", ratePsf: 32 },
  { prefix: "122", label: "Gurugram", ratePsf: 45 },
  { prefix: "201", label: "Noida / Ghaziabad", ratePsf: 38 },
]

const DEFAULT_RATE = 30

export type RentEstimateInput = {
  sqft: number
  pin: string
  amenities: AmenityKey[]
}

export type RentEstimateResult = {
  corridorLabel: string
  baseRatePsf: number
  adjustedRatePsf: number
  monthlyLowInr: number
  monthlyMidInr: number
  monthlyHighInr: number
  annualMidInr: number
  upliftPct: number
  disclaimer: string
}

export function estimateRent(input: RentEstimateInput): RentEstimateResult | { error: string } {
  const sqft = Number(input.sqft)
  if (!Number.isFinite(sqft) || sqft < 500 || sqft > 500_000) {
    return { error: "Enter area between 500 and 500,000 SF." }
  }
  const pin = String(input.pin ?? "").replace(/\D/g, "")
  if (pin.length < 3) {
    return { error: "Enter at least the first 3 digits of an India PIN code." }
  }

  const match =
    PIN_BASE.find((row) => pin.startsWith(row.prefix)) ??
    ({ prefix: pin.slice(0, 3), label: "India C&I (generic)", ratePsf: DEFAULT_RATE } as const)

  const uniqueAmenities = [...new Set(input.amenities)]
  const upliftPct = uniqueAmenities.reduce((sum, key) => {
    const opt = AMENITY_OPTIONS.find((a) => a.key === key)
    return sum + (opt?.upliftPct ?? 0)
  }, 0)

  const adjustedRatePsf = match.ratePsf * (1 + upliftPct / 100)
  const mid = adjustedRatePsf * sqft
  const low = mid * 0.88
  const high = mid * 1.14

  return {
    corridorLabel: match.label,
    baseRatePsf: match.ratePsf,
    adjustedRatePsf: Math.round(adjustedRatePsf * 100) / 100,
    monthlyLowInr: Math.round(low),
    monthlyMidInr: Math.round(mid),
    monthlyHighInr: Math.round(high),
    annualMidInr: Math.round(mid * 12),
    upliftPct,
    disclaimer:
      "Estimate only — heuristic demo based on corridor PIN prefixes and amenities. Not an appraisal, offer, or binding quote. Confirm with the landlord before budgeting.",
  }
}

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

import { z } from "zod"

/** Public property / listing segments for India expansion. */
export const PROPERTY_SEGMENTS = ["warehouse", "commercial", "residential"] as const
export type PropertySegment = (typeof PROPERTY_SEGMENTS)[number]

export const PROPERTY_SUBTYPES: Record<PropertySegment, readonly string[]> = {
  warehouse: ["logistics_park", "shed", "yard"],
  commercial: ["mall_store", "high_street", "office", "showroom"],
  residential: ["apartment", "independent_house", "villa", "pg_room"],
}

export type RateBasis = "per_sqft_month" | "flat_month"

export type LeaseProfile = {
  segment: PropertySegment
  gstOnRent: boolean
  defaultDepositMonths: number | null
  agreementHint: "commercial" | "11_month"
  rateBasisDefault: RateBasis
  rateCaption: string
  unitNoun: string
}

export function leaseProfile(segment: PropertySegment): LeaseProfile {
  if (segment === "residential") {
    return {
      segment,
      gstOnRent: false,
      defaultDepositMonths: 3,
      agreementHint: "11_month",
      rateBasisDefault: "flat_month",
      rateCaption: "₹ / month",
      unitNoun: "home",
    }
  }
  if (segment === "commercial") {
    return {
      segment,
      gstOnRent: true,
      defaultDepositMonths: 6,
      agreementHint: "commercial",
      rateBasisDefault: "flat_month",
      rateCaption: "₹ / month",
      unitNoun: "shop",
    }
  }
  return {
    segment: "warehouse",
    gstOnRent: true,
    defaultDepositMonths: null,
    agreementHint: "commercial",
    rateBasisDefault: "per_sqft_month",
    rateCaption: "₹ / SF · month",
    unitNoun: "bay",
  }
}

export function isPropertySegment(value: string): value is PropertySegment {
  return (PROPERTY_SEGMENTS as readonly string[]).includes(value)
}

export function segmentLabel(segment: PropertySegment) {
  if (segment === "warehouse") return "Warehouse / industrial"
  if (segment === "commercial") return "Commercial"
  return "Residential"
}

export function subtypeLabel(subtype: string) {
  return subtype
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

const warehouseAttributesSchema = z.object({
  clearHeightFt: z.string().optional(),
  docks: z.number().int().nonnegative().optional(),
  driveIns: z.number().int().nonnegative().optional(),
  powerAmps: z.string().optional(),
})

const commercialAttributesSchema = z.object({
  carpetSqft: z.number().nonnegative().optional(),
  superBuiltUpSqft: z.number().nonnegative().optional(),
  frontageFt: z.number().nonnegative().optional(),
  floor: z.string().optional(),
  mallName: z.string().optional(),
  footfallBand: z.string().optional(),
  camChargesMinor: z.number().int().nonnegative().optional(),
  fitOut: z.enum(["bare_shell", "fitted", "warm_shell"]).optional(),
})

const residentialAttributesSchema = z.object({
  bhk: z.number().positive().optional(),
  furnishing: z.enum(["unfurnished", "semi", "fully"]).optional(),
  bathrooms: z.number().nonnegative().optional(),
  societyAmenities: z.array(z.string()).optional(),
  parking: z.string().optional(),
  petPolicy: z.string().optional(),
  preferredTenants: z.string().optional(),
})

export type WarehouseAttributes = z.infer<typeof warehouseAttributesSchema>
export type CommercialAttributes = z.infer<typeof commercialAttributesSchema>
export type ResidentialAttributes = z.infer<typeof residentialAttributesSchema>
export type UnitAttributes =
  | WarehouseAttributes
  | CommercialAttributes
  | ResidentialAttributes

export function parseUnitAttributes(
  segment: PropertySegment,
  raw: string | null | undefined,
): UnitAttributes {
  let parsed: unknown = {}
  if (raw) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = {}
    }
  }
  if (segment === "commercial") {
    return commercialAttributesSchema.partial().parse(parsed ?? {})
  }
  if (segment === "residential") {
    return residentialAttributesSchema.partial().parse(parsed ?? {})
  }
  return warehouseAttributesSchema.partial().parse(parsed ?? {})
}

export function stringifyAttributes(attrs: UnitAttributes) {
  return JSON.stringify(attrs)
}

export function warehouseAttributesFromColumns(input: {
  clearHeight: string
  docks: number
  driveIns: number
  power: string
}): WarehouseAttributes {
  return {
    clearHeightFt: input.clearHeight,
    docks: input.docks,
    driveIns: input.driveIns,
    powerAmps: input.power,
  }
}

export function gstAppliesForUnit(input: {
  segment: PropertySegment
  gstApplicable: boolean | null
}) {
  if (input.gstApplicable != null) return input.gstApplicable
  return leaseProfile(input.segment).gstOnRent
}

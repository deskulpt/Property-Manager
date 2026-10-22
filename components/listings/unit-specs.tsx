import { SpecList } from "@/components/product"
import { money, sqft } from "@/lib/format"
import {
  leaseProfile,
  type CommercialAttributes,
  type PropertySegment,
  type ResidentialAttributes,
  type UnitAttributes,
  type WarehouseAttributes,
} from "@/lib/listing-schemas"

export function UnitSpecRows({
  segment,
  attributes,
  sqftValue,
  clearHeight,
  docks,
  driveIns,
  power,
  carpetSqft,
  bhk,
  securityDepositMonths,
  maintenanceMinor,
}: {
  segment: PropertySegment
  attributes: UnitAttributes
  sqftValue: number
  clearHeight: string
  docks: number
  driveIns: number
  power: string
  carpetSqft: number | null
  bhk: number | null
  securityDepositMonths: number | null
  maintenanceMinor: number | null
}) {
  if (segment === "commercial") {
    const a = attributes as CommercialAttributes
    return (
      <SpecList
        rows={[
          { label: "Carpet", value: a.carpetSqft ? sqft(a.carpetSqft) : carpetSqft ? sqft(carpetSqft) : "—" },
          { label: "Super built-up", value: a.superBuiltUpSqft ? sqft(a.superBuiltUpSqft) : sqft(sqftValue) },
          { label: "Frontage", value: a.frontageFt != null ? `${a.frontageFt} ft` : "—" },
          { label: "Floor", value: a.floor ?? "—" },
          { label: "Mall", value: a.mallName ?? "—" },
          { label: "Footfall", value: a.footfallBand ?? "—" },
          {
            label: "CAM",
            value: a.camChargesMinor != null ? `${money(a.camChargesMinor)} / mo` : "—",
          },
          { label: "Fit-out", value: a.fitOut?.replace("_", " ") ?? "—" },
        ]}
      />
    )
  }
  if (segment === "residential") {
    const a = attributes as ResidentialAttributes
    const deposit = securityDepositMonths ?? leaseProfile("residential").defaultDepositMonths
    return (
      <SpecList
        rows={[
          { label: "BHK", value: bhk != null ? String(bhk) : a.bhk != null ? String(a.bhk) : "—" },
          { label: "Carpet", value: carpetSqft ? sqft(carpetSqft) : a.bhk ? "—" : "—" },
          { label: "Furnishing", value: a.furnishing ?? "—" },
          { label: "Bathrooms", value: a.bathrooms != null ? String(a.bathrooms) : "—" },
          { label: "Parking", value: a.parking ?? "—" },
          { label: "Deposit", value: deposit != null ? `${deposit} months` : "—" },
          {
            label: "Maintenance",
            value: maintenanceMinor != null ? `${money(maintenanceMinor)} / mo` : "—",
          },
          {
            label: "Amenities",
            value: a.societyAmenities?.length ? a.societyAmenities.join(", ") : "—",
          },
        ]}
      />
    )
  }
  const a = attributes as WarehouseAttributes
  return (
    <SpecList
      rows={[
        { label: "Area", value: sqft(sqftValue) },
        { label: "Clear height", value: clearHeight || a.clearHeightFt || "—" },
        { label: "Docks", value: String(docks || a.docks || 0) },
        { label: "Drive-in", value: String(driveIns || a.driveIns || 0) },
        { label: "Power", value: power || a.powerAmps || "—" },
      ]}
    />
  )
}

export function listingSpecLine(card: {
  segment: PropertySegment
  sqft: number
  clearHeight: string
  docks: number
  driveIns: number
  power: string
  bhk: number | null
  carpetSqft: number | null
  furnishing: string | null
  fitOut: string | null
}) {
  if (card.segment === "residential") {
    return `${card.bhk ?? "—"} BHK · ${card.furnishing ?? "furnishing TBD"} · ${sqft(card.carpetSqft ?? card.sqft)}`
  }
  if (card.segment === "commercial") {
    return `${sqft(card.carpetSqft ?? card.sqft)} carpet · ${card.fitOut?.replace("_", " ") ?? "fit-out TBD"}`
  }
  return `${sqft(card.sqft)} · ${card.clearHeight} clear · ${card.docks} docks · ${card.driveIns} drive-in · ${card.power}`
}

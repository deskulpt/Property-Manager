import "server-only"
import QRCode from "qrcode"
import { getDb, propertyForLandlord, type PropertyRecord, type UnitRecord } from "@/lib/db"
import { sqft as formatSqft } from "@/lib/format"
import {
  evaluatePosterGate,
  propertyPosterSqft,
  publicPropertyPath,
  publicUnitPath,
  type PosterGate,
} from "@/lib/poster-shared"

export type { PosterGate, PosterMissingField, PosterPaper } from "@/lib/poster-shared"
export {
  absolutePublicUrl,
  evaluatePosterGate,
  paperLabel,
  propertyPosterSqft,
  publicPropertyPath,
  publicUnitPath,
} from "@/lib/poster-shared"

export { missingPosterFields } from "@/lib/poster-shared"

export type PosterPayload = {
  kind: "unit" | "property"
  tenantId: string
  tenantName: string
  title: string
  subtitle: string
  email: string | null
  address: string | null
  sizeLabel: string | null
  sizeSqft: number | null
  publicPath: string
  backHref: string
  propertyId: string
  unitId: string | null
  gate: PosterGate
}

export function orgContactEmail(tenantId: string): string | null {
  const row = getDb()
    .prepare(
      `SELECT email FROM users
       WHERE role = 'landlord_admin' AND tenant_id = ?
       ORDER BY name
       LIMIT 1`,
    )
    .get(tenantId) as { email?: string } | undefined
  const email = row?.email?.trim() ?? ""
  return email || null
}

function unitForLandlord(
  tenantId: string,
  unitId: string,
): { property: PropertyRecord; unit: UnitRecord } | null {
  const row = getDb()
    .prepare(
      `SELECT u.id AS unit_id, u.property_id
       FROM units u
       WHERE u.id = ? AND u.tenant_id = ?`,
    )
    .get(unitId, tenantId) as { unit_id?: string; property_id?: string } | undefined
  if (!row?.property_id) return null
  const property = propertyForLandlord(tenantId, row.property_id)
  if (!property) return null
  const unit = property.units.find((item) => item.id === unitId)
  if (!unit) return null
  return { property, unit }
}

export function buildUnitPoster(tenantId: string, unitId: string): PosterPayload | null {
  const loaded = unitForLandlord(tenantId, unitId)
  if (!loaded) return null
  const { property, unit } = loaded
  const email = orgContactEmail(tenantId)
  const address = property.address?.trim() || null
  const sizeSqft = unit.sqft > 0 ? unit.sqft : null
  const gate = evaluatePosterGate({ email, address, sizeSqft })

  return {
    kind: "unit",
    tenantId,
    tenantName: property.tenantName,
    title: property.name,
    subtitle: `Unit ${unit.code}`,
    email,
    address,
    sizeLabel: sizeSqft != null ? formatSqft(sizeSqft) : null,
    sizeSqft,
    publicPath: publicUnitPath(property.slug, unit.code),
    backHref: `/landlord/properties/${property.id}`,
    propertyId: property.id,
    unitId: unit.id,
    gate,
  }
}

export function buildPropertyPoster(tenantId: string, propertyId: string): PosterPayload | null {
  const property = propertyForLandlord(tenantId, propertyId)
  if (!property) return null
  const email = orgContactEmail(tenantId)
  const address = property.address?.trim() || null
  const sizeSqft = propertyPosterSqft(property.units)
  const gate = evaluatePosterGate({ email, address, sizeSqft })

  return {
    kind: "property",
    tenantId,
    tenantName: property.tenantName,
    title: property.name,
    subtitle: `${property.units.length} bay${property.units.length === 1 ? "" : "s"}`,
    email,
    address,
    sizeLabel: sizeSqft != null ? formatSqft(sizeSqft) : null,
    sizeSqft,
    publicPath: publicPropertyPath(property.slug),
    backHref: `/landlord/properties/${property.id}`,
    propertyId: property.id,
    unitId: null,
    gate,
  }
}

export async function qrDataUrl(targetUrl: string): Promise<string> {
  return QRCode.toDataURL(targetUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 640,
    color: { dark: "#13253A", light: "#FFFFFF" },
  })
}

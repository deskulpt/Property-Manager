import "server-only"

import { getDb } from "@/lib/db"
import type { ImportedListing } from "@/lib/import/listing-schema"

export type ListingImportDraftRecord = {
  id: string
  tenantId: string
  propertyId: string
  unitId: string
  sourceSite: string
  sourceUrl: string
  usedFixture: boolean
  payload: ImportedListing
  createdAt: string
  createdBy: string
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
}

/**
 * Persist an imported listing as a draft property + pending unit for the tenant.
 */
export function createDraftFromImport(input: {
  tenantId: string
  actorId: string
  listing: ImportedListing
  usedFixture: boolean
}): { ok: true; draft: ListingImportDraftRecord } | { ok: false; error: string } {
  const db = getDb()
  const listing = input.listing
  const id = `imp_${crypto.randomUUID().slice(0, 10)}`
  const propertyId = `p_${id}`
  const unitId = `u_${id}`
  const slugBase = slugify(listing.title) || "import"
  let slug = `import-${slugBase}`
  const slugTaken = db.prepare("SELECT id FROM properties WHERE slug = ?").get(slug)
  if (slugTaken) slug = `import-${slugBase}-${id.slice(-4)}`

  const monthlyMajor = listing.rent
  const sqft = Math.max(100, Math.round(listing.sqft))
  // Store asking as currency-major per SF / month (same convention as seed INR rows).
  const ratePsf = sqft > 0 ? Math.round((monthlyMajor / sqft) * 100) / 100 : 0
  const cityLine = `${listing.city.toUpperCase()} · ${listing.postalCode} · ${sqft.toLocaleString("en-IN")} SF · DRAFT IMPORT`
  const description = [
    listing.description,
    "",
    `Imported draft from ${listing.sourceSite}.`,
    `Source: ${listing.sourceUrl}`,
    listing.amenities.length ? `Amenities: ${listing.amenities.join(", ")}` : "",
    listing.deposit != null
      ? `Deposit (source): ${listing.currency} ${listing.deposit.toLocaleString("en-IN")}`
      : "",
    input.usedFixture ? "Parsed via demo fixture HTML (live fetch unavailable)." : "Parsed from public HTML.",
  ]
    .filter(Boolean)
    .join("\n")

  const now = new Date().toISOString()

  try {
    // Defaults keep imports on the warehouse spine; landlords can retarget segment later.
    db.prepare(
      `INSERT INTO properties (
        id, tenant_id, name, slug, address, area, city_line, total_sqft, segment, subtype,
        floor_plan_path, model_path, latitude, longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'warehouse', 'logistics_park', NULL, NULL, ?, ?)`,
    ).run(
      propertyId,
      input.tenantId,
      listing.title.slice(0, 120),
      slug,
      listing.address,
      listing.city,
      cityLine,
      sqft,
      listing.latitude ?? null,
      listing.longitude ?? null,
    )

    db.prepare(
      `INSERT INTO units (
        id, tenant_id, property_id, floor_id, code, sqft, clear_height, docks, drive_ins, power,
        rate_psf, rate_basis, rent_amount_minor, attributes, status, hotspot_x, hotspot_y,
        matterport_url, description
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, 0, 0, ?, ?, 'per_sqft_month', NULL, '{}', 'pending', NULL, NULL, NULL, ?)`,
    ).run(
      unitId,
      input.tenantId,
      propertyId,
      "IMP1",
      sqft,
      listing.propertyType.slice(0, 40),
      listing.currency === "CAD" ? "TBD / demo" : "TBD / demo",
      ratePsf,
      description.slice(0, 4000),
    )

    db.prepare(
      `INSERT INTO listing_import_drafts (
        id, tenant_id, property_id, unit_id, source_site, source_url, used_fixture, payload_json, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.tenantId,
      propertyId,
      unitId,
      listing.sourceSite,
      listing.sourceUrl,
      input.usedFixture ? 1 : 0,
      JSON.stringify(listing),
      now,
      input.actorId,
    )
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not create draft listing.",
    }
  }

  return {
    ok: true,
    draft: {
      id,
      tenantId: input.tenantId,
      propertyId,
      unitId,
      sourceSite: listing.sourceSite,
      sourceUrl: listing.sourceUrl,
      usedFixture: input.usedFixture,
      payload: listing,
      createdAt: now,
      createdBy: input.actorId,
    },
  }
}

export function listImportDrafts(tenantId: string): ListingImportDraftRecord[] {
  return (
    getDb()
      .prepare(
        `SELECT * FROM listing_import_drafts WHERE tenant_id = ? ORDER BY created_at DESC`,
      )
      .all(tenantId) as Record<string, unknown>[]
  ).map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    propertyId: String(row.property_id),
    unitId: String(row.unit_id),
    sourceSite: String(row.source_site),
    sourceUrl: String(row.source_url),
    usedFixture: Number(row.used_fixture) === 1,
    payload: JSON.parse(String(row.payload_json)) as ImportedListing,
    createdAt: String(row.created_at),
    createdBy: String(row.created_by),
  }))
}

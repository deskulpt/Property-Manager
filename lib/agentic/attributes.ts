/**
 * Attribute catalog Ask Easy may cite (tenant-scoped reads).
 * Mirrors SQLite columns / desk fields — not lorem placeholders.
 */

export type AttributeFieldDef = {
  field: string
  label: string
  entity: "property" | "unit" | "listing_draft" | "portfolio" | "application" | "ledger" | "media"
  description: string
}

/** Fields the agent is allowed to read and quote in citations. */
export const LISTING_ATTRIBUTE_CATALOG: readonly AttributeFieldDef[] = [
  // Property
  { field: "name", label: "Building name", entity: "property", description: "Property display name" },
  { field: "slug", label: "Slug", entity: "property", description: "Public URL slug" },
  { field: "address", label: "Address", entity: "property", description: "Street address" },
  { field: "area", label: "Market area", entity: "property", description: "Service / catchment area (e.g. Bhiwandi)" },
  { field: "cityLine", label: "City line", entity: "property", description: "City / PIN line" },
  { field: "totalSqft", label: "Total SF", entity: "property", description: "Building total square feet" },
  { field: "floorPlanPath", label: "Floor plan", entity: "property", description: "Uploaded floor plan path or none" },
  // Unit / listing bay
  { field: "code", label: "Bay code", entity: "unit", description: "Unit code (e.g. B1)" },
  { field: "sqft", label: "Bay SF", entity: "unit", description: "Leasable square feet" },
  { field: "ratePsf", label: "Rate ₹/SF", entity: "unit", description: "Asking rate per SF per month (INR)" },
  { field: "clearHeight", label: "Clear height", entity: "unit", description: "Clear height amenity" },
  { field: "docks", label: "Docks", entity: "unit", description: "Dock door count" },
  { field: "driveIns", label: "Drive-ins", entity: "unit", description: "Drive-in door count" },
  { field: "power", label: "Power", entity: "unit", description: "Electrical service" },
  { field: "status", label: "Status", entity: "unit", description: "available | pending | leased" },
  { field: "description", label: "Description", entity: "unit", description: "Listing copy" },
  { field: "matterportUrl", label: "Matterport", entity: "unit", description: "3D tour URL if set" },
  { field: "hotspotX", label: "Hotspot X", entity: "unit", description: "Floor-plan hotspot X" },
  { field: "hotspotY", label: "Hotspot Y", entity: "unit", description: "Floor-plan hotspot Y" },
  // Listing draft
  { field: "title", label: "Draft title", entity: "listing_draft", description: "Ask Easy draft title" },
  { field: "published", label: "Published", entity: "listing_draft", description: "Always false until explicit publish approve" },
  // Portfolio rollups
  { field: "occupancy", label: "Occupancy %", entity: "portfolio", description: "Leased / total units" },
  { field: "unitCount", label: "Unit count", entity: "portfolio", description: "Bays in org" },
  { field: "leasedCount", label: "Leased count", entity: "portfolio", description: "Leased bays" },
  { field: "rentRollCents", label: "Rent roll", entity: "portfolio", description: "Monthly rent roll (minor units)" },
  { field: "openApplications", label: "Open applications", entity: "portfolio", description: "Submitted applications" },
  { field: "openJobs", label: "Open jobs", entity: "portfolio", description: "Incomplete concierge jobs" },
  { field: "dueCents", label: "Ledger due", entity: "portfolio", description: "Sum of due ledger lines" },
  // Applications / ledger snippets
  { field: "company", label: "Applicant company", entity: "application", description: "Applicant org name" },
  { field: "applicationStatus", label: "Application status", entity: "application", description: "submitted | approved | denied" },
  { field: "ledgerKind", label: "Ledger kind", entity: "ledger", description: "rent | late_fee | payment | …" },
  { field: "ledgerStatus", label: "Ledger status", entity: "ledger", description: "due | paid | …" },
  { field: "mediaKind", label: "Media kind", entity: "media", description: "photo | gif | video | pano" },
] as const

export function listListingAttributeCatalog() {
  return LISTING_ATTRIBUTE_CATALOG.map((row) => ({ ...row }))
}

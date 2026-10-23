import "server-only"
import {
  applicationsForTenant,
  getDb,
  jobsForTenant,
  landlordOverview,
  ledgerForTenant,
  listPortfolio,
  propertyForLandlord,
} from "@/lib/db"
import { money, rateLabel, sqft } from "@/lib/format"
import { listListingAttributeCatalog } from "@/lib/agentic/attributes"
import { listingDraftById, listingDraftsForTenant } from "@/lib/agentic/proposals"
import type { AttributeCitation, AgentToolName } from "@/lib/agentic/types"

export type ReadToolResult = {
  kind: "read"
  toolName: AgentToolName
  reply: string
  citations: AttributeCitation[]
  data: unknown
}

function cite(
  entity: AttributeCitation["entity"],
  field: string,
  label: string,
  value: string,
  entityId?: string | null,
): AttributeCitation {
  return {
    entity,
    entityId: entityId ?? null,
    field,
    label,
    value,
  }
}

function propertiesForTenant(tenantId: string) {
  return listPortfolio().filter((p) => p.tenantId === tenantId)
}

export function readListProperties(tenantId: string): ReadToolResult {
  const properties = propertiesForTenant(tenantId)
  const citations: AttributeCitation[] = []
  for (const p of properties) {
    citations.push(cite("property", "name", "Building name", p.name, p.id))
    citations.push(cite("property", "area", "Market area", p.area, p.id))
    citations.push(cite("property", "totalSqft", "Total SF", sqft(p.totalSqft), p.id))
    citations.push(
      cite(
        "property",
        "floorPlanPath",
        "Floor plan",
        p.floorPlanPath ? "Uploaded" : "None",
        p.id,
      ),
    )
  }
  const reply =
    properties.length === 0
      ? "No buildings in this organisation yet. Add a property from the landlord desk."
      : `You have ${properties.length} building(s): ${properties
          .map((p) => `${p.name} (${p.area}, ${sqft(p.totalSqft)}, ${p.units.length} bay(s))`)
          .join("; ")}.`
  return {
    kind: "read",
    toolName: "list_properties",
    reply,
    citations,
    data: properties.map((p) => ({
      id: p.id,
      name: p.name,
      area: p.area,
      cityLine: p.cityLine,
      totalSqft: p.totalSqft,
      floorPlanPath: p.floorPlanPath,
      unitCount: p.units.length,
    })),
  }
}

function formatPropertyRead(property: {
  id: string
  tenantId: string
  name: string
  address: string
  area: string
  cityLine: string
  totalSqft: number
  floorPlanPath: string | null
  units: { id: string; code: string; status: string; sqft: number }[]
}): ReadToolResult {
  const citations: AttributeCitation[] = [
    cite("property", "name", "Building name", property.name, property.id),
    cite("property", "address", "Address", property.address, property.id),
    cite("property", "area", "Market area", property.area, property.id),
    cite("property", "cityLine", "City line", property.cityLine, property.id),
    cite("property", "totalSqft", "Total SF", sqft(property.totalSqft), property.id),
    cite(
      "property",
      "floorPlanPath",
      "Floor plan",
      property.floorPlanPath ? property.floorPlanPath : "None",
      property.id,
    ),
  ]
  const available = property.units.filter((u) => u.status === "available").length
  const reply = `${property.name} at ${property.address}, ${property.cityLine} (${property.area}). Total ${sqft(property.totalSqft)}. Floor plan: ${property.floorPlanPath ? "yes" : "not uploaded"}. ${property.units.length} bay(s), ${available} available.`
  return {
    kind: "read",
    toolName: "get_property",
    reply,
    citations,
    data: {
      id: property.id,
      name: property.name,
      address: property.address,
      area: property.area,
      cityLine: property.cityLine,
      totalSqft: property.totalSqft,
      floorPlanPath: property.floorPlanPath,
      units: property.units.map((u) => ({ id: u.id, code: u.code, status: u.status, sqft: u.sqft })),
    },
  }
}

export function readGetProperty(tenantId: string, propertyId: string | null | undefined): ReadToolResult {
  const properties = propertiesForTenant(tenantId)
  if (propertyId) {
    const property = propertyForLandlord(tenantId, propertyId)
    if (!property || property.tenantId !== tenantId) {
      return {
        kind: "read",
        toolName: "get_property",
        reply: "That building is not in this organisation.",
        citations: [],
        data: null,
      }
    }
    return formatPropertyRead(property)
  }
  const property = properties[0] ?? null
  if (!property) {
    return {
      kind: "read",
      toolName: "get_property",
      reply: "No building found for this organisation.",
      citations: [],
      data: null,
    }
  }
  return formatPropertyRead(property)
}

function formatUnitsRead(property: {
  name: string
  units: {
    id: string
    code: string
    sqft: number
    ratePsf: number
    status: string
    clearHeight: string
    docks: number
    driveIns: number
    power: string
    matterportUrl: string | null
    description: string
  }[]
}): ReadToolResult {
  const citations: AttributeCitation[] = []
  for (const u of property.units) {
    citations.push(cite("unit", "code", "Bay code", u.code, u.id))
    citations.push(cite("unit", "sqft", "Bay SF", sqft(u.sqft), u.id))
    citations.push(cite("unit", "ratePsf", "Rate ₹/SF", `₹${rateLabel(u.ratePsf)}/SF`, u.id))
    citations.push(cite("unit", "status", "Status", u.status, u.id))
    citations.push(cite("unit", "clearHeight", "Clear height", u.clearHeight, u.id))
    citations.push(cite("unit", "docks", "Docks", String(u.docks), u.id))
    citations.push(cite("unit", "power", "Power", u.power, u.id))
  }
  const reply =
    property.units.length === 0
      ? `${property.name} has no bays yet.`
      : `${property.name} bays: ${property.units
          .map(
            (u) =>
              `${u.code} (${u.status}, ${sqft(u.sqft)}, ₹${rateLabel(u.ratePsf)}/SF, ${u.clearHeight}, ${u.docks} docks)`,
          )
          .join("; ")}.`
  return {
    kind: "read",
    toolName: "list_units",
    reply,
    citations,
    data: property.units.map((u) => ({
      id: u.id,
      code: u.code,
      sqft: u.sqft,
      ratePsf: u.ratePsf,
      status: u.status,
      clearHeight: u.clearHeight,
      docks: u.docks,
      driveIns: u.driveIns,
      power: u.power,
      matterportUrl: u.matterportUrl,
      description: u.description,
    })),
  }
}

export function readListUnits(
  tenantId: string,
  propertyId: string | null | undefined,
): ReadToolResult {
  const properties = propertiesForTenant(tenantId)
  if (propertyId) {
    const property = propertyForLandlord(tenantId, propertyId)
    if (!property || property.tenantId !== tenantId) {
      return {
        kind: "read",
        toolName: "list_units",
        reply: "That building is not in this organisation.",
        citations: [],
        data: [],
      }
    }
    return formatUnitsRead(property)
  }
  const property = properties[0] ?? null
  if (!property) {
    return {
      kind: "read",
      toolName: "list_units",
      reply: "No bays found for this organisation.",
      citations: [],
      data: [],
    }
  }
  return formatUnitsRead(property)
}

export function readGetUnit(
  tenantId: string,
  propertyId: string | null | undefined,
  unitId: string | null | undefined,
  prompt: string,
): ReadToolResult {
  const properties = propertiesForTenant(tenantId)
  let property =
    propertyId != null && propertyId !== ""
      ? propertyForLandlord(tenantId, propertyId)
      : null
  if (propertyId && (!property || property.tenantId !== tenantId)) {
    return {
      kind: "read",
      toolName: "get_unit",
      reply: "That building is not in this organisation.",
      citations: [],
      data: null,
    }
  }
  property = property ?? properties[0] ?? null
  if (!property || property.tenantId !== tenantId) {
    return {
      kind: "read",
      toolName: "get_unit",
      reply: "No building in this organisation.",
      citations: [],
      data: null,
    }
  }
  const codeMatch = prompt.match(/\b([A-Z]?\d{1,3}[A-Z]?)\b/i)
  const unit =
    (unitId ? property.units.find((u) => u.id === unitId) : null) ??
    (codeMatch
      ? property.units.find((u) => u.code.toLowerCase() === codeMatch[1].toLowerCase())
      : null) ??
    property.units.find((u) => u.status === "available") ??
    property.units[0] ??
    null
  if (!unit || unit.tenantId !== tenantId) {
    return {
      kind: "read",
      toolName: "get_unit",
      reply: "That bay is not in this organisation.",
      citations: [],
      data: null,
    }
  }
  const mediaCount = Number(
    (
      getDb()
        .prepare("SELECT COUNT(*) AS c FROM unit_media WHERE unit_id = ? AND tenant_id = ?")
        .get(unit.id, tenantId) as { c: number }
    ).c,
  )
  const citations: AttributeCitation[] = [
    cite("unit", "code", "Bay code", unit.code, unit.id),
    cite("unit", "sqft", "Bay SF", sqft(unit.sqft), unit.id),
    cite("unit", "ratePsf", "Rate ₹/SF", `₹${rateLabel(unit.ratePsf)}/SF`, unit.id),
    cite("unit", "clearHeight", "Clear height", unit.clearHeight, unit.id),
    cite("unit", "docks", "Docks", String(unit.docks), unit.id),
    cite("unit", "driveIns", "Drive-ins", String(unit.driveIns), unit.id),
    cite("unit", "power", "Power", unit.power, unit.id),
    cite("unit", "status", "Status", unit.status, unit.id),
    cite(
      "unit",
      "matterportUrl",
      "Matterport",
      unit.matterportUrl ? "Tour linked" : "None",
      unit.id,
    ),
    cite("unit", "description", "Description", unit.description.slice(0, 120), unit.id),
    cite("media", "mediaKind", "Media count", String(mediaCount), unit.id),
  ]
  const reply = `Unit ${unit.code} at ${property.name}: ${sqft(unit.sqft)}, ₹${rateLabel(unit.ratePsf)}/SF/mo, clear ${unit.clearHeight}, ${unit.docks} docks / ${unit.driveIns} drive-in(s), power ${unit.power}, status ${unit.status}. Matterport ${unit.matterportUrl ? "linked" : "not set"}. ${mediaCount} media item(s). ${unit.description.slice(0, 180)}`
  return {
    kind: "read",
    toolName: "get_unit",
    reply,
    citations,
    data: { ...unit, propertyName: property.name, mediaCount },
  }
}

export function readGetListingDraft(
  tenantId: string,
  draftId?: string | null,
): ReadToolResult {
  const drafts = listingDraftsForTenant(tenantId)
  const draft = (draftId ? listingDraftById(tenantId, draftId) : null) ?? drafts[0] ?? null
  if (!draft) {
    return {
      kind: "read",
      toolName: "get_listing_draft",
      reply: "No listing drafts yet. Ask me to draft listing copy for a bay.",
      citations: [],
      data: null,
    }
  }
  const citations: AttributeCitation[] = [
    cite("listing_draft", "title", "Draft title", draft.title, draft.id),
    cite("listing_draft", "code", "Bay code", draft.code, draft.id),
    cite("listing_draft", "sqft", "Bay SF", sqft(draft.sqft), draft.id),
    cite("listing_draft", "ratePsf", "Rate ₹/SF", `₹${rateLabel(draft.ratePsf)}/SF`, draft.id),
    cite("listing_draft", "published", "Published", draft.published ? "yes" : "no (draft)", draft.id),
    cite("listing_draft", "description", "Description", draft.description.slice(0, 120), draft.id),
  ]
  return {
    kind: "read",
    toolName: "get_listing_draft",
    reply: `Draft “${draft.title}” for Unit ${draft.code}: ${sqft(draft.sqft)}, ₹${rateLabel(draft.ratePsf)}/SF — ${draft.published ? "published" : "unpublished draft"}. Publish still needs an explicit approve step.`,
    citations,
    data: draft,
  }
}

export function readListListingAttributes(): ReadToolResult {
  const catalog = listListingAttributeCatalog()
  const citations = catalog.slice(0, 12).map((row) =>
    cite("schema", row.field, row.label, row.description, row.entity),
  )
  return {
    kind: "read",
    toolName: "list_listing_attributes",
    reply: `I can read ${catalog.length} desk fields across property, unit, listing draft, portfolio, applications, ledger, and media — always scoped to your organisation. Ask about SF, rate, docks, floor plan, occupancy, open applications, or due ledger.`,
    citations,
    data: catalog,
  }
}

export function readSummarizePortfolio(tenantId: string): ReadToolResult {
  const overview = landlordOverview(tenantId)
  const properties = propertiesForTenant(tenantId)
  const apps = applicationsForTenant(tenantId).filter((a) => a.status === "submitted")
  const dueLines = ledgerForTenant(tenantId).filter((l) => l.status === "due")
  const openJobs = jobsForTenant(tenantId).filter((j) => j.status !== "complete")

  const citations: AttributeCitation[] = [
    cite("portfolio", "unitCount", "Unit count", String(overview.unitCount)),
    cite("portfolio", "leasedCount", "Leased count", String(overview.leasedCount)),
    cite("portfolio", "occupancy", "Occupancy %", `${overview.occupancy}%`),
    cite("portfolio", "rentRollCents", "Rent roll", money(overview.rentRollCents)),
    cite("portfolio", "openApplications", "Open applications", String(overview.openApplications)),
    cite("portfolio", "openJobs", "Open jobs", String(overview.openJobs)),
    cite("portfolio", "dueCents", "Ledger due", money(overview.dueCents)),
  ]
  for (const p of properties) {
    citations.push(cite("property", "name", "Building name", p.name, p.id))
    citations.push(cite("property", "area", "Market area", p.area, p.id))
  }
  for (const a of apps.slice(0, 3)) {
    citations.push(cite("application", "company", "Applicant company", a.company, a.id))
    citations.push(
      cite("application", "applicationStatus", "Application status", a.status, a.id),
    )
  }
  for (const line of dueLines.slice(0, 3)) {
    citations.push(cite("ledger", "ledgerKind", "Ledger kind", line.kind, line.id))
    citations.push(cite("ledger", "ledgerStatus", "Ledger status", line.status, line.id))
  }

  const buildingLine =
    properties.length === 0
      ? "No buildings yet."
      : properties.map((p) => `${p.name} (${p.area}, ${p.units.length} bays)`).join("; ")

  const reply = [
    `Portfolio onboard: ${properties.length} building(s) · ${overview.unitCount} bay(s) · ${overview.occupancy}% occupied · rent roll ${money(overview.rentRollCents)}/mo.`,
    buildingLine,
    `Open applications: ${overview.openApplications}. Open concierge jobs: ${openJobs.length}. Ledger due: ${money(overview.dueCents)}.`,
    "Ask about a building, bay SF/rate/amenities, floor plan, a draft listing, or say “assign an electrician” (that waits for your Approve).",
  ].join(" ")

  return {
    kind: "read",
    toolName: "summarize_portfolio",
    reply,
    citations,
    data: {
      overview,
      properties: properties.map((p) => ({
        id: p.id,
        name: p.name,
        area: p.area,
        unitCount: p.units.length,
        floorPlanPath: p.floorPlanPath,
      })),
      openApplicationIds: apps.map((a) => a.id),
      openJobIds: openJobs.map((j) => j.id),
    },
  }
}

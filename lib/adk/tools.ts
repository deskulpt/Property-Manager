import "server-only"
import {
  applicationsForTenant,
  landlordOverview,
  listPortfolio,
  propertyForLandlord,
  searchListings,
} from "@/lib/db"
import type { AdkScope, AdkToolCall, AdkToolName, AdkToolResult } from "@/lib/adk/types"

/**
 * Read-only ADK tools. Landlord tools always require session tenantId.
 * Public tools only return catalog data already visible on /listings.
 */

export type AdkToolContext = {
  scope: AdkScope
  tenantId?: string | null
}

function requireLandlordTenant(ctx: AdkToolContext): string | { error: string } {
  if (ctx.scope !== "landlord") {
    return { error: "Landlord desk tool — sign in as a landlord admin." }
  }
  if (!ctx.tenantId) {
    return { error: "Session tenant required for this tool." }
  }
  return ctx.tenantId
}

export function executeAdkTool(
  call: AdkToolCall,
  ctx: AdkToolContext,
): AdkToolResult {
  switch (call.name) {
    case "search_listings":
      return toolSearchListings(call.args, ctx)
    case "property_summary":
      return toolPropertySummary(call.args, ctx)
    case "unit_availability":
      return toolUnitAvailability(call.args, ctx)
    case "applications_summary":
      return toolApplicationsSummary(ctx)
    default:
      return { name: call.name, ok: false, error: `Unknown tool: ${call.name}` }
  }
}

function toolSearchListings(
  args: Record<string, unknown>,
  ctx: AdkToolContext,
): AdkToolResult {
  const q = typeof args.q === "string" ? args.q : ""
  const area = typeof args.area === "string" ? args.area : undefined
  const status =
    args.status === "available" || args.status === "leased" || args.status === "hold"
      ? args.status
      : undefined

  // Public: all landlords. Landlord desk: force session tenant only.
  const tenantId =
    ctx.scope === "landlord"
      ? (() => {
          const t = requireLandlordTenant(ctx)
          return typeof t === "string" ? t : null
        })()
      : typeof args.tenantId === "string"
        ? args.tenantId
        : undefined

  if (ctx.scope === "landlord" && !tenantId) {
    return { name: "search_listings", ok: false, error: "Session tenant required." }
  }

  // Prefer area facet when the query is a known area token (substring match on haystack is brittle).
  const areaFromQ =
    !area && q
      ? ["Bhiwandi", "Whitefield", "Andheri East", "Sriperumbudur", "Thane"].find((a) =>
          q.toLowerCase().includes(a.toLowerCase()),
        )
      : undefined
  const resolvedArea = area || areaFromQ
  const textQ =
    resolvedArea && q.toLowerCase() === resolvedArea.toLowerCase() ? undefined : q || undefined

  const cards = searchListings({
    q: textQ,
    area: resolvedArea,
    tenantId: tenantId ?? undefined,
    statuses: status ? [status] : ["available"],
  }).slice(0, 12)

  return {
    name: "search_listings",
    ok: true,
    data: {
      count: cards.length,
      listings: cards.map((c) => ({
        property: c.propertyName,
        slug: c.propertySlug,
        unit: c.code,
        area: c.area,
        city: c.cityLine,
        sqft: c.sqft,
        ratePsf: c.ratePsf,
        status: c.status,
        landlord: c.tenantName,
        // Never leak foreign tenant ids to public clients beyond catalog landlord name.
        ...(ctx.scope === "landlord" ? { propertyId: c.propertyId, unitId: c.unitId } : {}),
      })),
    },
  }
}

function toolPropertySummary(
  args: Record<string, unknown>,
  ctx: AdkToolContext,
): AdkToolResult {
  const tenantCheck = requireLandlordTenant(ctx)
  if (typeof tenantCheck !== "string") {
    return { name: "property_summary", ok: false, error: tenantCheck.error }
  }
  const tenantId = tenantCheck
  const propertyId = typeof args.propertyId === "string" ? args.propertyId : null
  const overview = landlordOverview(tenantId)

  if (propertyId) {
    const property = propertyForLandlord(tenantId, propertyId)
    if (!property) {
      return {
        name: "property_summary",
        ok: false,
        error: "Property not found in your organisation.",
      }
    }
    const available = property.units.filter((u) => u.status === "available").length
    const leased = property.units.filter((u) => u.status === "leased").length
    return {
      name: "property_summary",
      ok: true,
      data: {
        property: {
          id: property.id,
          name: property.name,
          area: property.area,
          address: property.address,
          unitCount: property.units.length,
          available,
          leased,
        },
        portfolio: overview,
      },
    }
  }

  const portfolio = listPortfolio().filter((p) => p.tenantId === tenantId)
  return {
    name: "property_summary",
    ok: true,
    data: {
      portfolio: overview,
      properties: portfolio.map((p) => ({
        id: p.id,
        name: p.name,
        area: p.area,
        units: p.units.length,
        available: p.units.filter((u) => u.status === "available").length,
      })),
    },
  }
}

function toolUnitAvailability(
  args: Record<string, unknown>,
  ctx: AdkToolContext,
): AdkToolResult {
  const tenantCheck = requireLandlordTenant(ctx)
  if (typeof tenantCheck !== "string") {
    return { name: "unit_availability", ok: false, error: tenantCheck.error }
  }
  const tenantId = tenantCheck
  const propertyId = typeof args.propertyId === "string" ? args.propertyId : null
  const q = typeof args.q === "string" ? args.q.toLowerCase() : ""

  let properties = listPortfolio().filter((p) => p.tenantId === tenantId)
  if (propertyId) {
    properties = properties.filter((p) => p.id === propertyId)
    if (properties.length === 0) {
      return {
        name: "unit_availability",
        ok: false,
        error: "Property not found in your organisation.",
      }
    }
  }

  const units = properties.flatMap((p) =>
    p.units
      .filter((u) => {
        if (q && !`${u.code} ${p.name} ${p.area}`.toLowerCase().includes(q)) return false
        return true
      })
      .map((u) => ({
        propertyId: p.id,
        property: p.name,
        unitId: u.id,
        code: u.code,
        status: u.status,
        sqft: u.sqft,
        ratePsf: u.ratePsf,
        clearHeight: u.clearHeight,
        docks: u.docks,
      })),
  )

  return {
    name: "unit_availability",
    ok: true,
    data: {
      count: units.length,
      available: units.filter((u) => u.status === "available").length,
      units: units.slice(0, 24),
    },
  }
}

function toolApplicationsSummary(ctx: AdkToolContext): AdkToolResult {
  const tenantCheck = requireLandlordTenant(ctx)
  if (typeof tenantCheck !== "string") {
    return { name: "applications_summary", ok: false, error: tenantCheck.error }
  }
  const apps = applicationsForTenant(tenantCheck)
  const byStatus: Record<string, number> = {}
  for (const app of apps) {
    byStatus[app.status] = (byStatus[app.status] ?? 0) + 1
  }
  return {
    name: "applications_summary",
    ok: true,
    data: {
      total: apps.length,
      byStatus,
      recent: apps.slice(0, 8).map((a) => ({
        id: a.id,
        company: a.company,
        status: a.status,
        unit: a.unitCode,
        property: a.propertyName,
        createdAt: a.createdAt,
      })),
    },
  }
}

/** Tool catalog for instructions / Gemini function declarations. */
export const ADK_TOOL_SPECS: {
  name: AdkToolName
  description: string
  scopes: AdkScope[]
  parameters: Record<string, { type: string; description: string }>
}[] = [
  {
    name: "search_listings",
    description: "Search public or tenant-scoped available listings by text, area, or status.",
    scopes: ["public", "landlord"],
    parameters: {
      q: { type: "string", description: "Free-text query (area, building, unit)." },
      area: { type: "string", description: "Market area filter, e.g. Bhiwandi." },
      status: { type: "string", description: "Unit status: available | leased | hold." },
    },
  },
  {
    name: "property_summary",
    description: "Summarise a landlord property or whole portfolio (occupancy, unit counts).",
    scopes: ["landlord"],
    parameters: {
      propertyId: { type: "string", description: "Optional property id for one building." },
    },
  },
  {
    name: "unit_availability",
    description: "List unit availability for the session landlord organisation only.",
    scopes: ["landlord"],
    parameters: {
      propertyId: { type: "string", description: "Optional property id." },
      q: { type: "string", description: "Filter by unit code or building name." },
    },
  },
  {
    name: "applications_summary",
    description: "Summarise applications for the session landlord (counts + recent rows).",
    scopes: ["landlord"],
    parameters: {},
  },
]

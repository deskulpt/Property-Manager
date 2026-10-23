import "server-only"
import { eligibleProviders, listPortfolio } from "@/lib/db"
import type { Trade } from "@/lib/format"
import { applyListingDraft, createProposal } from "@/lib/agentic/proposals"
import { getDb } from "@/lib/db"
import {
  readGetListingDraft,
  readGetProperty,
  readGetUnit,
  readListListingAttributes,
  readListProperties,
  readListUnits,
  readSummarizePortfolio,
  type ReadToolResult,
} from "@/lib/agentic/reads"
import type {
  AgentProposal,
  AgentToolName,
  AttributeCitation,
  DraftListingPayload,
  ListingDraft,
  ProposeJobPayload,
} from "@/lib/agentic/types"

/**
 * ADK-style thin tool registry — wrappers around Easy Rental commands only.
 * Mutating tools never run side effects here; they only enqueue proposals.
 * Read tools return real tenant-scoped SQLite attributes + citations.
 */

export type ToolContext = {
  tenantId: string
  userId: string
  prompt: string
  propertyId?: string | null
  unitId?: string | null
}

export type ToolDefinition = {
  name: AgentToolName
  description: string
  mutating: boolean
  requiresApproval: boolean
}

export type ToolDispatchResult =
  | {
      kind: "draft_listing"
      proposal: AgentProposal
      draft: ListingDraft
      reply: string
      citations?: AttributeCitation[]
    }
  | {
      kind: "propose_job_assignment"
      proposal: AgentProposal
      reply: string
      citations?: AttributeCitation[]
    }
  | {
      kind: "list_providers"
      providers: { id: string; name: string; trade: string; serviceArea: string }[]
      reply: string
      citations?: AttributeCitation[]
    }
  | (ReadToolResult & { citations: AttributeCitation[] })
  | { kind: "error"; error: string; citations?: AttributeCitation[] }

export const ASK_EASY_TOOLS: readonly ToolDefinition[] = [
  {
    name: "summarize_portfolio",
    description: "Onboard / portfolio rollup: buildings, occupancy, rent roll, apps, ledger due.",
    mutating: false,
    requiresApproval: false,
  },
  {
    name: "list_properties",
    description: "List buildings for the session landlord org.",
    mutating: false,
    requiresApproval: false,
  },
  {
    name: "get_property",
    description: "Read one property: address, area, SF, floor plan, bay counts.",
    mutating: false,
    requiresApproval: false,
  },
  {
    name: "list_units",
    description: "List bays with SF, rate, amenities, status for a property.",
    mutating: false,
    requiresApproval: false,
  },
  {
    name: "get_unit",
    description: "Read one bay’s listing attributes (SF, rate, docks, power, Matterport, copy).",
    mutating: false,
    requiresApproval: false,
  },
  {
    name: "get_listing_draft",
    description: "Read the latest Ask Easy listing draft (unpublished).",
    mutating: false,
    requiresApproval: false,
  },
  {
    name: "list_listing_attributes",
    description: "Schema dump of fields Ask Easy may cite.",
    mutating: false,
    requiresApproval: false,
  },
  {
    name: "list_providers_by_trade",
    description: "Read-only list of approved providers for a trade in the property area.",
    mutating: false,
    requiresApproval: false,
  },
  {
    name: "draft_listing",
    description: "Soft-write unpublished listing draft fields for a bay. Never publishes.",
    mutating: false,
    requiresApproval: false,
  },
  {
    name: "propose_job_assignment",
    description:
      "Propose create+assign concierge job. Requires landlord Approve before notify.",
    mutating: true,
    requiresApproval: true,
  },
] as const

export function getTool(name: AgentToolName): ToolDefinition | undefined {
  return ASK_EASY_TOOLS.find((t) => t.name === name)
}

export function toolCatalogForModel(): {
  name: AgentToolName
  description: string
  mutating: boolean
}[] {
  return ASK_EASY_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    mutating: t.mutating,
  }))
}

function firstProperty(tenantId: string) {
  return listPortfolio().find((p) => p.tenantId === tenantId) ?? null
}

function resolveProperty(ctx: ToolContext) {
  return (
    (ctx.propertyId
      ? listPortfolio().find((p) => p.id === ctx.propertyId && p.tenantId === ctx.tenantId)
      : null) ?? firstProperty(ctx.tenantId)
  )
}

export function resolveTrade(prompt: string): Trade {
  const lower = prompt.toLowerCase()
  if (lower.includes("plumb")) return "plumber"
  if (lower.includes("clean")) return "cleaning"
  if (lower.includes("courier") || lower.includes("deliver")) return "courier"
  return "electrician"
}

function stubDraftCopy(code: string, prompt: string): Omit<DraftListingPayload, "propertyId" | "unitId"> {
  return {
    code,
    title: `${code} · ready-to-lease bay`,
    description: [
      `Ask Easy draft for Unit ${code}.`,
      prompt.trim()
        ? `Landlord prompt: ${prompt.trim().slice(0, 280)}`
        : "Industrial bay with dock access and clear height for warehouse ops.",
      "Rate and specs are template values — review before publish. This draft is unpublished.",
    ].join(" "),
    ratePsf: 48,
    sqft: 20000,
    clearHeight: "28'",
    docks: 4,
    driveIns: 1,
    power: "600A / 415V",
  }
}

/** Dispatch a planned tool through the registry (proposal or read-only). */
export function dispatchTool(
  toolName: AgentToolName,
  ctx: ToolContext,
  overrides?: Partial<ProposeJobPayload & DraftListingPayload> & Record<string, unknown>,
): ToolDispatchResult {
  const def = getTool(toolName)
  if (!def) return { kind: "error", error: `Unknown tool: ${toolName}` }

  // Read-heavy onboard tools — no property required for portfolio/schema
  if (toolName === "summarize_portfolio") return readSummarizePortfolio(ctx.tenantId)
  if (toolName === "list_properties") return readListProperties(ctx.tenantId)
  if (toolName === "list_listing_attributes") return readListListingAttributes()
  if (toolName === "get_listing_draft") {
    return readGetListingDraft(ctx.tenantId, typeof overrides?.draftId === "string" ? overrides.draftId : null)
  }
  if (toolName === "get_property") {
    return readGetProperty(ctx.tenantId, ctx.propertyId)
  }
  if (toolName === "list_units") {
    return readListUnits(ctx.tenantId, ctx.propertyId)
  }
  if (toolName === "get_unit") {
    return readGetUnit(ctx.tenantId, ctx.propertyId, ctx.unitId, ctx.prompt)
  }

  const property = resolveProperty(ctx)
  if (!property) return { kind: "error", error: "Add a building before using Ask Easy." }

  if (toolName === "list_providers_by_trade") {
    const trade = (overrides?.trade as Trade | undefined) ?? resolveTrade(ctx.prompt)
    const providers = eligibleProviders(ctx.tenantId, property.area, trade).map((p) => ({
      id: p.id,
      name: p.name,
      trade: p.trade ?? trade,
      serviceArea: p.serviceArea ?? property.area,
    }))
    return {
      kind: "list_providers",
      providers,
      reply:
        providers.length === 0
          ? `No approved ${trade} providers in ${property.area} yet. Approve someone under Providers first.`
          : `Found ${providers.length} approved ${trade} provider(s) in ${property.area} (read-only; no notify).`,
      citations: providers.slice(0, 4).map((p) => ({
        entity: "property" as const,
        entityId: property.id,
        field: "provider",
        label: p.trade,
        value: p.name,
      })),
    }
  }

  if (toolName === "propose_job_assignment") {
    const trade = (overrides?.trade as Trade | undefined) ?? resolveTrade(ctx.prompt)
    const matches = eligibleProviders(ctx.tenantId, property.area, trade)
    const providerId = overrides?.providerId ?? matches[0]?.id
    const provider = matches.find((p) => p.id === providerId) ?? matches[0]
    if (!provider) {
      return {
        kind: "error",
        error: `No approved ${trade} in ${property.area}. Approve a provider before proposing an assignment.`,
      }
    }
    const unit =
      (ctx.unitId ? property.units.find((u) => u.id === ctx.unitId) : null) ??
      property.units[0] ??
      null
    const payload: ProposeJobPayload = {
      propertyId: property.id,
      unitId: unit?.id ?? null,
      title: overrides?.title ?? `Ask Easy: assign ${trade} — ${ctx.prompt.slice(0, 60)}`,
      details:
        overrides?.details ??
        `Ask Easy proposal from landlord prompt. Trade: ${trade}. Provider: ${provider.name}. Approval required before create/assign/notify.`,
      trade,
      providerId: provider.id,
    }
    const proposal = createProposal({
      tenantId: ctx.tenantId,
      toolName: "propose_job_assignment",
      payload,
      promptSummary: ctx.prompt.slice(0, 200),
      createdBy: ctx.userId,
      requiresApproval: true,
    })
    return {
      kind: "propose_job_assignment",
      proposal,
      reply: `Proposed assigning ${provider.name} (${trade}) at ${property.name}. Waiting in the approval queue — reject leaves no job; approve runs the concierge command.`,
    }
  }

  // draft_listing — soft apply to draft only (never publish)
  const unit =
    (ctx.unitId ? property.units.find((u) => u.id === ctx.unitId) : null) ??
    property.units.find((u) => u.status === "available") ??
    property.units[0] ??
    null
  const code = overrides?.code ?? unit?.code ?? "DRAFT"
  const base = stubDraftCopy(code, ctx.prompt)
  const payload: DraftListingPayload = {
    propertyId: property.id,
    unitId: unit?.id ?? null,
    code,
    title: overrides?.title ?? base.title,
    description: overrides?.description ?? base.description,
    ratePsf: overrides?.ratePsf ?? unit?.ratePsf ?? base.ratePsf,
    sqft: overrides?.sqft ?? unit?.sqft ?? base.sqft,
    clearHeight: overrides?.clearHeight ?? unit?.clearHeight ?? base.clearHeight,
    docks: overrides?.docks ?? unit?.docks ?? base.docks,
    driveIns: overrides?.driveIns ?? unit?.driveIns ?? base.driveIns,
    power: overrides?.power ?? unit?.power ?? base.power,
  }
  const proposal = createProposal({
    tenantId: ctx.tenantId,
    toolName: "draft_listing",
    payload,
    promptSummary: ctx.prompt.slice(0, 200),
    createdBy: ctx.userId,
    requiresApproval: false,
  })
  const applied = applyListingDraft({
    tenantId: ctx.tenantId,
    ...payload,
    sourceProposalId: proposal.id,
    actorUserId: ctx.userId,
  })
  if (!applied.ok) return { kind: "error", error: applied.error }

  getDb()
    .prepare(
      `UPDATE agent_proposals SET outcome_json = ?, status = 'executed' WHERE id = ? AND tenant_id = ?`,
    )
    .run(JSON.stringify({ draftId: applied.draft.id, published: false }), proposal.id, ctx.tenantId)

  return {
    kind: "draft_listing",
    proposal: {
      ...proposal,
      status: "executed",
      outcomeJson: JSON.stringify({ draftId: applied.draft.id }),
    },
    draft: applied.draft,
    reply: `Draft listing saved for Unit ${code} at ${property.name}. Unpublished — publish stays a manual/approved step.`,
    citations: [
      {
        entity: "listing_draft",
        entityId: applied.draft.id,
        field: "title",
        label: "Draft title",
        value: applied.draft.title,
      },
      {
        entity: "listing_draft",
        entityId: applied.draft.id,
        field: "published",
        label: "Published",
        value: "no (draft)",
      },
    ],
  }
}

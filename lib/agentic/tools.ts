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
  DraftRentalAgreementPayload,
  LeaseAgreement,
  LeaseParty,
  ListingDraft,
  ProposeEsignSendPayload,
  ProposeJobPayload,
  ProposeListUnitPayload,
  ProposeUnlistUnitPayload,
  UpsertLeasePartyPayload,
  UpsertOccupantLedgerPayload,
} from "@/lib/agentic/types"
import {
  draftRentalAgreement,
  extractOnboardHints,
  leaseAgreementById,
  leaseAgreementsForTenant,
  leasePartiesForUnit,
} from "@/lib/agentic/lease-onboard"
import { resolveLawNotes, type JurisdictionCountry } from "@/lib/agentic/jurisdictions"

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
  | {
      kind: "propose_list_unit"
      proposal: AgentProposal
      reply: string
      citations?: AttributeCitation[]
    }
  | {
      kind: "propose_unlist_unit"
      proposal: AgentProposal
      reply: string
      citations?: AttributeCitation[]
    }
  | {
      kind: "propose_upsert_occupant_ledger"
      proposal: AgentProposal
      reply: string
      citations?: AttributeCitation[]
    }
  | {
      kind: "propose_upsert_lease_party"
      proposal: AgentProposal
      reply: string
      citations?: AttributeCitation[]
    }
  | {
      kind: "draft_rental_agreement"
      proposal: AgentProposal
      agreement: LeaseAgreement
      parties: LeaseParty[]
      reply: string
      citations?: AttributeCitation[]
    }
  | {
      kind: "propose_esign_send"
      proposal: AgentProposal
      reply: string
      citations?: AttributeCitation[]
    }
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
  {
    name: "propose_list_unit",
    description:
      "Propose listing a unit as publicly available. Never auto-publishes or notifies.",
    mutating: true,
    requiresApproval: true,
  },
  {
    name: "propose_unlist_unit",
    description:
      "Propose delisting a unit from the public catalog (hold). Never auto-notifies.",
    mutating: true,
    requiresApproval: true,
  },
  {
    name: "propose_upsert_occupant_ledger",
    description:
      "Propose occupant details + optional rent ledger seed. Money lines only after Approve.",
    mutating: true,
    requiresApproval: true,
  },
  {
    name: "propose_upsert_lease_party",
    description:
      "Propose primary/secondary/guarantor lease party (name, email, phone, address).",
    mutating: true,
    requiresApproval: true,
  },
  {
    name: "draft_rental_agreement",
    description:
      "Draft a jurisdiction-aware standard rental agreement (IN/CA) from parties + unit. Soft draft; not legal advice.",
    mutating: false,
    requiresApproval: false,
  },
  {
    name: "propose_esign_send",
    description:
      "Propose sending the draft agreement via demo eSign (Digio/eMudhra/DocuSign later). Never auto-sends.",
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

function resolveUnit(
  property: NonNullable<ReturnType<typeof resolveProperty>>,
  ctx: ToolContext,
) {
  return (
    (ctx.unitId ? property.units.find((u) => u.id === ctx.unitId) : null) ??
    property.units.find((u) => u.status === "available") ??
    property.units[0] ??
    null
  )
}

function monthlyRentCents(ratePsf: number, sqft: number) {
  return Math.round(ratePsf * sqft * 100)
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


  const hints = extractOnboardHints(ctx.prompt)
  const o = (overrides ?? {}) as Record<string, unknown>

  if (toolName === "propose_list_unit" || toolName === "propose_unlist_unit") {
    const unit = resolveUnit(property, ctx)
    if (!unit) return { kind: "error", error: "Pick a bay to list or delist." }
    const payload: ProposeListUnitPayload | ProposeUnlistUnitPayload = {
      propertyId: property.id,
      unitId: (o.unitId as string | undefined) ?? unit.id,
    }
    const proposal = createProposal({
      tenantId: ctx.tenantId,
      toolName,
      payload,
      promptSummary: ctx.prompt.slice(0, 200),
      createdBy: ctx.userId,
      requiresApproval: true,
    })
    const verb = toolName === "propose_list_unit" ? "list" : "delist"
    return {
      kind: toolName,
      proposal,
      reply: `Proposed to ${verb} Unit ${unit.code} at ${property.name}. Approve to apply — never auto-notifies applicants.`,
    }
  }

  if (toolName === "propose_upsert_occupant_ledger") {
    const unit = resolveUnit(property, ctx)
    if (!unit) return { kind: "error", error: "Pick a bay for the occupant / ledger seed." }
    const name =
      (o.name as string | undefined) ??
      hints.name ??
      "New Occupant"
    const email =
      (o.email as string | undefined) ??
      hints.email ??
      `occupant+${unit.code.toLowerCase()}@example.com`
    const payload: UpsertOccupantLedgerPayload = {
      propertyId: property.id,
      unitId: (o.unitId as string | undefined) ?? unit.id,
      userId: (o.userId as string | undefined) ?? null,
      name,
      email,
      phone: (o.phone as string | undefined) ?? hints.phone,
      company: o.company as string | undefined,
      seedRentCents:
        typeof o.seedRentCents === "number"
          ? o.seedRentCents
          : monthlyRentCents(unit.ratePsf, unit.sqft),
      dueOn: o.dueOn as string | undefined,
      description: o.description as string | undefined,
    }
    const proposal = createProposal({
      tenantId: ctx.tenantId,
      toolName: "propose_upsert_occupant_ledger",
      payload,
      promptSummary: ctx.prompt.slice(0, 200),
      createdBy: ctx.userId,
      requiresApproval: true,
    })
    return {
      kind: "propose_upsert_occupant_ledger",
      proposal,
      reply: `Proposed occupant ${name} <${email}> on Unit ${unit.code} with a rent ledger seed. Approve to write — reject leaves ledger unchanged.`,
    }
  }

  if (toolName === "propose_upsert_lease_party") {
    const unit = resolveUnit(property, ctx)
    if (!unit) return { kind: "error", error: "Pick a bay for the lease party." }
    const role =
      (o.role as UpsertLeasePartyPayload["role"] | undefined) ??
      hints.role ??
      "primary"
    const name = (o.name as string | undefined) ?? hints.name ?? "Lease Party"
    const email =
      (o.email as string | undefined) ??
      hints.email ??
      `${role}+${unit.code.toLowerCase()}@example.com`
    const payload: UpsertLeasePartyPayload = {
      propertyId: property.id,
      unitId: (o.unitId as string | undefined) ?? unit.id,
      partyId: (o.partyId as string | undefined) ?? null,
      role,
      name,
      email,
      phone: (o.phone as string | undefined) ?? hints.phone,
      addressLine1: o.addressLine1 as string | undefined,
      addressLine2: o.addressLine2 as string | undefined,
      city: o.city as string | undefined,
      region: (o.region as string | undefined) ?? hints.region,
      postalCode: o.postalCode as string | undefined,
      country: (o.country as string | undefined) ?? hints.country,
    }
    const proposal = createProposal({
      tenantId: ctx.tenantId,
      toolName: "propose_upsert_lease_party",
      payload,
      promptSummary: ctx.prompt.slice(0, 200),
      createdBy: ctx.userId,
      requiresApproval: true,
    })
    return {
      kind: "propose_upsert_lease_party",
      proposal,
      reply: `Proposed ${role} party ${name} <${email}> on Unit ${unit.code}. Approve to persist — tenant-scoped; reject writes nothing.`,
    }
  }

  if (toolName === "draft_rental_agreement") {
    const unit = resolveUnit(property, ctx)
    if (!unit) return { kind: "error", error: "Pick a bay to draft the rental agreement." }
    const country =
      ((o.country as string | undefined) ?? hints.country ?? "IN") as JurisdictionCountry
    const region = (o.region as string | undefined) ?? hints.region ?? (country === "CA" ? "ON" : "MH")
    const lawNotes =
      (o.lawNotes as string | undefined) ?? resolveLawNotes(country, region)
    const payload: DraftRentalAgreementPayload = {
      propertyId: property.id,
      unitId: (o.unitId as string | undefined) ?? unit.id,
      country,
      region,
      lawNotes,
    }

    // Soft-apply draft immediately (like draft_listing); still audit via proposal row.
    const drafted = draftRentalAgreement({
      tenantId: ctx.tenantId,
      unitId: payload.unitId,
      country: payload.country,
      region: payload.region,
      lawNotes: payload.lawNotes,
    })
    if (!drafted.ok) return { kind: "error", error: drafted.error }

    const proposal = createProposal({
      tenantId: ctx.tenantId,
      toolName: "draft_rental_agreement",
      payload,
      promptSummary: ctx.prompt.slice(0, 200),
      createdBy: ctx.userId,
      requiresApproval: false,
    })
    getDb()
      .prepare(
        `UPDATE agent_proposals SET outcome_json = ?, status = 'executed' WHERE id = ? AND tenant_id = ?`,
      )
      .run(
        JSON.stringify({ agreementId: drafted.agreement.id, status: drafted.agreement.status }),
        proposal.id,
        ctx.tenantId,
      )

    const parties = leasePartiesForUnit(ctx.tenantId, payload.unitId)
    return {
      kind: "draft_rental_agreement",
      proposal: {
        ...proposal,
        status: "executed",
        outcomeJson: JSON.stringify({ agreementId: drafted.agreement.id }),
      },
      agreement: drafted.agreement,
      parties,
      reply: `Draft rental agreement ready for Unit ${unit.code} (${payload.country}/${payload.region}). Preview at /landlord/ask/agreements/${drafted.agreement.id}. Not legal advice — propose eSign send only after you review.`,
    }
  }

  if (toolName === "propose_esign_send") {
    const unit = resolveUnit(property, ctx)
    if (!unit) return { kind: "error", error: "Pick a bay whose agreement you want to send." }
    const agreementId =
      (o.agreementId as string | undefined) ??
      leaseAgreementsForTenant(ctx.tenantId).find(
        (a) => a.unitId === unit.id && (a.status === "draft" || a.status === "ready_for_esign"),
      )?.id
    if (!agreementId) {
      return {
        kind: "error",
        error: "No draft agreement on this bay. Ask Easy to draft a rental agreement first.",
      }
    }
    const agreement = leaseAgreementById(ctx.tenantId, agreementId)
    if (!agreement) return { kind: "error", error: "Agreement not found for this organisation." }
    if (agreement.status === "sent" || agreement.status === "signed") {
      return { kind: "error", error: `Agreement is already ${agreement.status}.` }
    }
    const payload: ProposeEsignSendPayload = {
      propertyId: property.id,
      unitId: unit.id,
      agreementId,
    }
    const proposal = createProposal({
      tenantId: ctx.tenantId,
      toolName: "propose_esign_send",
      payload,
      promptSummary: ctx.prompt.slice(0, 200),
      createdBy: ctx.userId,
      requiresApproval: true,
    })
    return {
      kind: "propose_esign_send",
      proposal,
      reply: `Proposed eSign send for agreement ${agreementId.slice(0, 8)}… (Unit ${unit.code}). Approve once to mark sent via demo adapter — reject leaves status unchanged. Never auto-sends.`,
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

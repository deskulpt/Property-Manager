/** Ask Easy — shared types (ADK-style tools + citations). */

export type AgentToolName =
  | "draft_listing"
  | "propose_job_assignment"
  | "list_providers_by_trade"
  | "list_properties"
  | "get_property"
  | "list_units"
  | "get_unit"
  | "get_listing_draft"
  | "list_listing_attributes"
  | "summarize_portfolio"

export type ProposalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "failed"

export type AuditKind =
  | "prompt"
  | "propose"
  | "approve"
  | "reject"
  | "execute"
  | "fail"
  | "draft_apply"
  | "read"

export type AttributeCitation = {
  entity:
    | "property"
    | "unit"
    | "listing_draft"
    | "portfolio"
    | "application"
    | "ledger"
    | "media"
    | "schema"
  entityId: string | null
  field: string
  label: string
  value: string
}

export type DraftListingPayload = {
  propertyId: string
  unitId?: string | null
  code: string
  title: string
  description: string
  ratePsf: number
  sqft: number
  clearHeight: string
  docks: number
  driveIns: number
  power: string
}

export type ProposeJobPayload = {
  propertyId: string
  unitId?: string | null
  title: string
  details: string
  trade: "electrician" | "plumber" | "courier" | "cleaning"
  providerId: string
}

export type ListProvidersPayload = {
  propertyId: string
  trade: "electrician" | "plumber" | "courier" | "cleaning"
}

export type ToolPayload = DraftListingPayload | ProposeJobPayload | ListProvidersPayload

export type AgentProposal = {
  id: string
  tenantId: string
  toolName: AgentToolName
  payload: ToolPayload
  status: ProposalStatus
  promptSummary: string
  createdBy: string
  createdAt: string
  decidedBy: string | null
  decidedAt: string | null
  outcomeJson: string | null
  error: string | null
}

export type AgentAuditEvent = {
  id: string
  tenantId: string
  kind: AuditKind
  proposalId: string | null
  summary: string
  detailJson: string | null
  actorUserId: string | null
  createdAt: string
}

export type ListingDraft = {
  id: string
  tenantId: string
  propertyId: string
  unitId: string | null
  code: string
  title: string
  description: string
  ratePsf: number
  sqft: number
  clearHeight: string
  docks: number
  driveIns: number
  power: string
  /** Always false from stub soft-apply — publish is a later approve step. */
  published: boolean
  createdAt: string
  updatedAt: string
  sourceProposalId: string | null
}

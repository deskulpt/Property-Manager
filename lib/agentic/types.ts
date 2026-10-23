/** Ask Easy — shared types (ADK-style tools + citations + lease onboard). */

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
  | "propose_list_unit"
  | "propose_unlist_unit"
  | "propose_upsert_occupant_ledger"
  | "propose_upsert_lease_party"
  | "draft_rental_agreement"
  | "propose_esign_send"

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

export type LeasePartyRole = "primary" | "secondary" | "guarantor"

export type LeaseAgreementStatus =
  | "draft"
  | "ready_for_esign"
  | "sent"
  | "signed"
  | "void"

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

export type ProposeListUnitPayload = {
  propertyId: string
  unitId: string
}

export type ProposeUnlistUnitPayload = {
  propertyId: string
  unitId: string
}

export type UpsertOccupantLedgerPayload = {
  propertyId: string
  unitId: string
  userId?: string | null
  name: string
  email: string
  phone?: string
  company?: string
  /** When set and > 0, seeds a due rent ledger line on approve. */
  seedRentCents?: number
  dueOn?: string
  description?: string
}

export type UpsertLeasePartyPayload = {
  propertyId: string
  unitId: string
  partyId?: string | null
  role: LeasePartyRole
  name: string
  email: string
  phone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  region?: string
  postalCode?: string
  country?: string
}

export type DraftRentalAgreementPayload = {
  propertyId: string
  unitId: string
  country: string
  region: string
  lawNotes?: string | null
}

export type ProposeEsignSendPayload = {
  propertyId: string
  unitId: string
  agreementId: string
}

export type ToolPayload =
  | DraftListingPayload
  | ProposeJobPayload
  | ListProvidersPayload
  | ProposeListUnitPayload
  | ProposeUnlistUnitPayload
  | UpsertOccupantLedgerPayload
  | UpsertLeasePartyPayload
  | DraftRentalAgreementPayload
  | ProposeEsignSendPayload

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
  /** Always false from stub soft-apply — publish/list is an approve step. */
  published: boolean
  createdAt: string
  updatedAt: string
  sourceProposalId: string | null
}

export type LeaseParty = {
  id: string
  tenantId: string
  unitId: string
  leaseId: string | null
  role: LeasePartyRole
  name: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  postalCode: string
  country: string
  createdAt: string
  updatedAt: string
}

export type LeaseAgreement = {
  id: string
  tenantId: string
  unitId: string
  leaseId: string | null
  country: string
  region: string
  lawNotes: string
  status: LeaseAgreementStatus
  documentHtml: string
  documentJson: string
  esignProvider: string | null
  esignEnvelopeId: string | null
  createdAt: string
  updatedAt: string
}

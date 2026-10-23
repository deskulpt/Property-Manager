/**
 * Ask Easy / Slice L — ADK-style thin agent loop on-platform.
 * Landlord desk: `/landlord/ask` (unified onboard + lease pack). Public catalog chat: `/ask` via `lib/adk`.
 * Patterns mirror BDK / Google ADK-JS. No `@cursor/bdk` dependency.
 */
export { tenantHasAskEasy, askEasyGateReason } from "@/lib/agentic/gate"
export { runStubAskEasy, type StubTurnResult } from "@/lib/agentic/stub"
export { runAskEasy, runAskEasyStub, type AskEasyTurnResult } from "@/lib/agentic/runtime"
export {
  resolveModelPlan,
  resolveModelPlanSync,
  liveModelConfigured,
  planStubTurn,
  type ModelPlan,
  type ModelProviderId,
} from "@/lib/agentic/model"
export {
  ASK_EASY_TOOLS,
  getTool,
  toolCatalogForModel,
  dispatchTool,
} from "@/lib/agentic/tools"
export { listListingAttributeCatalog, LISTING_ATTRIBUTE_CATALOG } from "@/lib/agentic/attributes"
export {
  approveProposal,
  rejectProposal,
  executeApprovedProposal,
  type ExecuteResult,
} from "@/lib/agentic/executor"
export {
  createProposal,
  getProposal,
  markProposal,
  pendingProposals,
  proposalsForTenant,
  listingDraftsForTenant,
  applyListingDraft,
  publishListingDraft,
} from "@/lib/agentic/proposals"
export { auditEventsForTenant, writeAuditEvent } from "@/lib/agentic/audit"
export type {
  AgentProposal,
  AgentAuditEvent,
  ListingDraft,
  AgentToolName,
  ProposalStatus,
  AttributeCitation,
} from "@/lib/agentic/types"

/** Public / grounded ADK runner (sibling platform surface). */
export { runAdkTurn, adkRuntimeMode, looksLikeGroundedQuestion } from "@/lib/adk"

export {
  JURISDICTION_PRESETS,
  listJurisdictionCountries,
  getRegionPreset,
  resolveLawNotes,
  parseCountry,
} from "@/lib/agentic/jurisdictions"
export {
  leasePartyById,
  leasePartiesForUnit,
  leasePartiesForTenant,
  leaseAgreementById,
  leaseAgreementsForTenant,
  draftRentalAgreement,
  upsertLeaseParty,
  executeListUnit,
  executeUnlistUnit,
  executeUpsertOccupantLedger,
} from "@/lib/agentic/lease-onboard"
export { getESignProvider, DemoESignAdapter, type ESignProvider } from "@/lib/agentic/esign"

import "server-only"
import { assignJob, createJob, getDb } from "@/lib/db"
import { notify } from "@/lib/notifications"
import { writeAuditEvent } from "@/lib/agentic/audit"
import {
  getProposal,
  markProposal,
  publishListingDraft,
} from "@/lib/agentic/proposals"
import { getESignProvider } from "@/lib/agentic/esign"
import {
  executeListUnit,
  executeUnlistUnit,
  executeUpsertOccupantLedger,
  leaseAgreementById,
  leasePartiesForUnit,
  markAgreementStatus,
  upsertLeaseParty,
} from "@/lib/agentic/lease-onboard"
import type {
  ProposeEsignSendPayload,
  ProposeJobPayload,
  ProposeListUnitPayload,
  ProposeUnlistUnitPayload,
  UpsertLeasePartyPayload,
  UpsertOccupantLedgerPayload,
} from "@/lib/agentic/types"

/**
 * Hard gate: mutating tools run only after an approved proposal.
 * Calling execute without status === 'approved' is a hard failure (eval target).
 */

export type ExecuteResult =
  | {
      ok: true
      jobId?: string
      notifiedProviderId?: string | null
      agreementId?: string
      envelopeId?: string
      unitId?: string
      partyId?: string
      userId?: string
      ledgerEntryId?: string | null
    }
  | {
      ok: false
      error: string
      code: "not_found" | "not_approved" | "already_done" | "tool_error" | "forbidden"
    }

/**
 * Attempt to run a proposal's tool. Must already be `approved`.
 * Rejected / pending / executed proposals cannot mutate.
 */
export function executeApprovedProposal(input: {
  tenantId: string
  proposalId: string
  actorUserId: string
}): ExecuteResult {
  const proposal = getProposal(input.tenantId, input.proposalId)
  if (!proposal) {
    writeAuditEvent({
      tenantId: input.tenantId,
      kind: "fail",
      proposalId: input.proposalId,
      summary: "Execute refused: proposal not found for tenant",
      actorUserId: input.actorUserId,
    })
    return { ok: false, error: "Proposal not found.", code: "not_found" }
  }

  if (proposal.status === "executed") {
    return { ok: false, error: "Proposal already executed.", code: "already_done" }
  }

  if (proposal.status === "rejected") {
    writeAuditEvent({
      tenantId: input.tenantId,
      kind: "fail",
      proposalId: proposal.id,
      summary: "Execute refused: proposal was rejected",
      actorUserId: input.actorUserId,
    })
    return { ok: false, error: "Rejected proposals cannot execute.", code: "not_approved" }
  }

  // HARD GATE — pending (or any non-approved) must not mutate
  if (proposal.status !== "approved") {
    writeAuditEvent({
      tenantId: input.tenantId,
      kind: "fail",
      proposalId: proposal.id,
      summary: `Execute refused: status is ${proposal.status}, not approved`,
      detail: { status: proposal.status, toolName: proposal.toolName },
      actorUserId: input.actorUserId,
    })
    return {
      ok: false,
      error: "Proposal must be approved before execute.",
      code: "not_approved",
    }
  }

  if (proposal.toolName === "propose_job_assignment") {
    return executeJobAssignment(
      input.tenantId,
      proposal.id,
      proposal.payload as ProposeJobPayload,
      input.actorUserId,
    )
  }

  if (proposal.toolName === "propose_list_unit") {
    const payload = proposal.payload as ProposeListUnitPayload
    const result = executeListUnit({ tenantId: input.tenantId, unitId: payload.unitId })
    if (!result.ok) {
      markProposal(input.tenantId, proposal.id, {
        status: "failed",
        decidedBy: input.actorUserId,
        error: result.error,
      })
      return { ok: false, error: result.error, code: "tool_error" }
    }
    markProposal(input.tenantId, proposal.id, {
      status: "executed",
      decidedBy: input.actorUserId,
      outcome: result,
    })
    writeAuditEvent({
      tenantId: input.tenantId,
      kind: "execute",
      proposalId: proposal.id,
      summary: `Listed unit ${payload.unitId} (no notify)`,
      detail: result,
      actorUserId: input.actorUserId,
    })
    return { ok: true, unitId: payload.unitId }
  }

  if (proposal.toolName === "propose_unlist_unit") {
    const payload = proposal.payload as ProposeUnlistUnitPayload
    const result = executeUnlistUnit({ tenantId: input.tenantId, unitId: payload.unitId })
    if (!result.ok) {
      markProposal(input.tenantId, proposal.id, {
        status: "failed",
        decidedBy: input.actorUserId,
        error: result.error,
      })
      return { ok: false, error: result.error, code: "tool_error" }
    }
    markProposal(input.tenantId, proposal.id, {
      status: "executed",
      decidedBy: input.actorUserId,
      outcome: result,
    })
    writeAuditEvent({
      tenantId: input.tenantId,
      kind: "execute",
      proposalId: proposal.id,
      summary: `Delisted unit ${payload.unitId} (no notify)`,
      detail: result,
      actorUserId: input.actorUserId,
    })
    return { ok: true, unitId: payload.unitId }
  }

  if (proposal.toolName === "propose_upsert_occupant_ledger") {
    const payload = proposal.payload as UpsertOccupantLedgerPayload
    const result = executeUpsertOccupantLedger({ ...payload, tenantId: input.tenantId })
    if (!result.ok) {
      markProposal(input.tenantId, proposal.id, {
        status: "failed",
        decidedBy: input.actorUserId,
        error: result.error,
      })
      return { ok: false, error: result.error, code: "tool_error" }
    }
    markProposal(input.tenantId, proposal.id, {
      status: "executed",
      decidedBy: input.actorUserId,
      outcome: result,
    })
    writeAuditEvent({
      tenantId: input.tenantId,
      kind: "execute",
      proposalId: proposal.id,
      summary: `Occupant/ledger upsert user ${result.userId}`,
      detail: result,
      actorUserId: input.actorUserId,
    })
    return {
      ok: true,
      userId: result.userId,
      ledgerEntryId: result.ledgerEntryId,
      unitId: payload.unitId,
    }
  }

  if (proposal.toolName === "propose_upsert_lease_party") {
    const payload = proposal.payload as UpsertLeasePartyPayload
    const result = upsertLeaseParty({ ...payload, tenantId: input.tenantId })
    if (!result.ok) {
      markProposal(input.tenantId, proposal.id, {
        status: "failed",
        decidedBy: input.actorUserId,
        error: result.error,
      })
      return { ok: false, error: result.error, code: "tool_error" }
    }
    markProposal(input.tenantId, proposal.id, {
      status: "executed",
      decidedBy: input.actorUserId,
      outcome: { partyId: result.party.id, role: result.party.role },
    })
    writeAuditEvent({
      tenantId: input.tenantId,
      kind: "execute",
      proposalId: proposal.id,
      summary: `Lease party ${result.party.role} ${result.party.name}`,
      detail: { partyId: result.party.id },
      actorUserId: input.actorUserId,
    })
    return { ok: true, partyId: result.party.id, unitId: payload.unitId }
  }

  if (proposal.toolName === "propose_esign_send") {
    return executeEsignSend(input.tenantId, proposal.id, proposal.payload as ProposeEsignSendPayload, input.actorUserId)
  }

  if (proposal.toolName === "draft_listing" || proposal.toolName === "draft_rental_agreement") {
    // Soft drafts already applied; publish/send stays separate approve tools
    const blocked = publishListingDraft(input.tenantId, "")
    markProposal(input.tenantId, proposal.id, {
      status: "failed",
      decidedBy: input.actorUserId,
      error: blocked.error,
    })
    return { ok: false, error: blocked.error, code: "forbidden" }
  }

  return { ok: false, error: `Tool ${proposal.toolName} is not executable.`, code: "tool_error" }
}

function executeEsignSend(
  tenantId: string,
  proposalId: string,
  payload: ProposeEsignSendPayload,
  actorUserId: string,
): ExecuteResult {
  const agreement = leaseAgreementById(tenantId, payload.agreementId)
  if (!agreement) {
    markProposal(tenantId, proposalId, {
      status: "failed",
      decidedBy: actorUserId,
      error: "Agreement not found.",
    })
    return { ok: false, error: "Agreement not found.", code: "not_found" }
  }
  if (agreement.status === "sent" || agreement.status === "signed") {
    markProposal(tenantId, proposalId, {
      status: "failed",
      decidedBy: actorUserId,
      error: `Already ${agreement.status}.`,
    })
    return { ok: false, error: `Agreement already ${agreement.status}.`, code: "already_done" }
  }

  const parties = leasePartiesForUnit(tenantId, agreement.unitId)
  const signers = parties.map((p) => ({
    role: p.role,
    name: p.name,
    email: p.email,
  }))

  // Mark ready then send via adapter (demo)
  markAgreementStatus(tenantId, agreement.id, { status: "ready_for_esign" })
  const provider = getESignProvider()
  const sent = provider.send({
    agreementId: agreement.id,
    tenantId,
    signers,
    documentHtml: agreement.documentHtml,
    country: agreement.country,
    region: agreement.region,
  })
  // Adapter may be sync or Promise — handle sync DemoESignAdapter
  if (sent instanceof Promise) {
    // Sync path only in demo; refuse async in executor for OSS predictability
    markProposal(tenantId, proposalId, {
      status: "failed",
      decidedBy: actorUserId,
      error: "Async eSign providers are not wired in this demo executor.",
    })
    return { ok: false, error: "Async eSign not supported in demo.", code: "tool_error" }
  }
  if (!sent.ok) {
    markProposal(tenantId, proposalId, {
      status: "failed",
      decidedBy: actorUserId,
      error: sent.error,
    })
    writeAuditEvent({
      tenantId,
      kind: "fail",
      proposalId,
      summary: `eSign send failed: ${sent.error}`,
      actorUserId,
    })
    return { ok: false, error: sent.error, code: "tool_error" }
  }

  markAgreementStatus(tenantId, agreement.id, {
    status: "sent",
    esignProvider: sent.provider,
    esignEnvelopeId: sent.envelopeId,
  })
  markProposal(tenantId, proposalId, {
    status: "executed",
    decidedBy: actorUserId,
    outcome: { agreementId: agreement.id, envelopeId: sent.envelopeId, provider: sent.provider },
  })
  writeAuditEvent({
    tenantId,
    kind: "execute",
    proposalId,
    summary: `eSign sent via ${sent.provider} · ${sent.envelopeId}`,
    detail: { agreementId: agreement.id, envelopeId: sent.envelopeId },
    actorUserId,
  })
  return { ok: true, agreementId: agreement.id, envelopeId: sent.envelopeId }
}

function executeJobAssignment(
  tenantId: string,
  proposalId: string,
  payload: ProposeJobPayload,
  actorUserId: string,
): ExecuteResult {
  const created = createJob({
    tenantId,
    propertyId: payload.propertyId,
    unitId: payload.unitId ?? null,
    title: payload.title,
    details: payload.details,
    trade: payload.trade,
    providerId: null,
  })
  if (!created.ok) {
    markProposal(tenantId, proposalId, {
      status: "failed",
      decidedBy: actorUserId,
      error: created.error,
    })
    writeAuditEvent({
      tenantId,
      kind: "fail",
      proposalId,
      summary: `Job create failed: ${created.error}`,
      actorUserId,
    })
    return { ok: false, error: created.error, code: "tool_error" }
  }

  const assigned = assignJob(tenantId, created.id, payload.providerId)
  if (!assigned.ok) {
    markProposal(tenantId, proposalId, {
      status: "failed",
      decidedBy: actorUserId,
      error: assigned.error,
      outcome: { jobId: created.id },
    })
    writeAuditEvent({
      tenantId,
      kind: "fail",
      proposalId,
      summary: `Assign failed: ${assigned.error}`,
      detail: { jobId: created.id },
      actorUserId,
    })
    return { ok: false, error: assigned.error, code: "tool_error" }
  }

  notify({
    userId: payload.providerId,
    title: "Concierge job assigned",
    body: `${payload.title} at ${created.propertyName} is waiting for you to accept.`,
    href: "/provider",
  })

  markProposal(tenantId, proposalId, {
    status: "executed",
    decidedBy: actorUserId,
    outcome: { jobId: created.id, providerId: payload.providerId },
  })
  writeAuditEvent({
    tenantId,
    kind: "execute",
    proposalId,
    summary: `Executed propose_job_assignment → job ${created.id}`,
    detail: { jobId: created.id, providerId: payload.providerId },
    actorUserId,
  })

  return { ok: true, jobId: created.id, notifiedProviderId: payload.providerId }
}

/**
 * Approve then execute in one landlord action.
 * Reject leaves no side effects (no job, no notify, no eSign, no ledger charge).
 */
export function approveProposal(input: {
  tenantId: string
  proposalId: string
  actorUserId: string
}): ExecuteResult {
  const proposal = getProposal(input.tenantId, input.proposalId)
  if (!proposal) return { ok: false, error: "Proposal not found.", code: "not_found" }
  if (proposal.status !== "pending") {
    return { ok: false, error: `Cannot approve a ${proposal.status} proposal.`, code: "already_done" }
  }
  markProposal(input.tenantId, input.proposalId, {
    status: "approved",
    decidedBy: input.actorUserId,
  })
  writeAuditEvent({
    tenantId: input.tenantId,
    kind: "approve",
    proposalId: input.proposalId,
    summary: `Approved ${proposal.toolName}`,
    actorUserId: input.actorUserId,
  })
  return executeApprovedProposal(input)
}

export function rejectProposal(input: {
  tenantId: string
  proposalId: string
  actorUserId: string
}): { ok: true } | { ok: false; error: string } {
  const proposal = getProposal(input.tenantId, input.proposalId)
  if (!proposal) return { ok: false, error: "Proposal not found." }
  if (proposal.status !== "pending") {
    return { ok: false, error: `Cannot reject a ${proposal.status} proposal.` }
  }

  // Snapshot side-effect counters before reject — must not change
  const db = getDb()
  const beforeJobs = Number(
    (db.prepare("SELECT COUNT(*) AS c FROM jobs WHERE tenant_id = ?").get(input.tenantId) as { c: number }).c,
  )
  const beforeLedger = Number(
    (db.prepare("SELECT COUNT(*) AS c FROM ledger_entries WHERE tenant_id = ?").get(input.tenantId) as { c: number }).c,
  )
  const beforeParties = Number(
    (db.prepare("SELECT COUNT(*) AS c FROM lease_parties WHERE tenant_id = ?").get(input.tenantId) as { c: number }).c,
  )
  const beforeSent = Number(
    (
      db
        .prepare("SELECT COUNT(*) AS c FROM lease_agreements WHERE tenant_id = ? AND status = 'sent'")
        .get(input.tenantId) as { c: number }
    ).c,
  )

  markProposal(input.tenantId, input.proposalId, {
    status: "rejected",
    decidedBy: input.actorUserId,
  })
  writeAuditEvent({
    tenantId: input.tenantId,
    kind: "reject",
    proposalId: input.proposalId,
    summary: `Rejected ${proposal.toolName}`,
    actorUserId: input.actorUserId,
  })

  const afterJobs = Number(
    (db.prepare("SELECT COUNT(*) AS c FROM jobs WHERE tenant_id = ?").get(input.tenantId) as { c: number }).c,
  )
  const afterLedger = Number(
    (db.prepare("SELECT COUNT(*) AS c FROM ledger_entries WHERE tenant_id = ?").get(input.tenantId) as { c: number }).c,
  )
  const afterParties = Number(
    (db.prepare("SELECT COUNT(*) AS c FROM lease_parties WHERE tenant_id = ?").get(input.tenantId) as { c: number }).c,
  )
  const afterSent = Number(
    (
      db
        .prepare("SELECT COUNT(*) AS c FROM lease_agreements WHERE tenant_id = ? AND status = 'sent'")
        .get(input.tenantId) as { c: number }
    ).c,
  )
  if (
    afterJobs !== beforeJobs ||
    afterLedger !== beforeLedger ||
    afterParties !== beforeParties ||
    afterSent !== beforeSent
  ) {
    return { ok: false, error: "Invariant violated: reject mutated desk state." }
  }
  return { ok: true }
}

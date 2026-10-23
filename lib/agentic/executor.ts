import "server-only"
import { assignJob, createJob, getDb } from "@/lib/db"
import { notify } from "@/lib/notifications"
import { writeAuditEvent } from "@/lib/agentic/audit"
import {
  getProposal,
  markProposal,
  publishListingDraft,
} from "@/lib/agentic/proposals"
import type { ProposeJobPayload } from "@/lib/agentic/types"

/**
 * Hard gate: mutating tools run only after an approved proposal.
 * Calling execute without status === 'approved' is a hard failure (eval target).
 */

export type ExecuteResult =
  | { ok: true; jobId?: string; notifiedProviderId?: string | null }
  | { ok: false; error: string; code: "not_found" | "not_approved" | "already_done" | "tool_error" | "forbidden" }

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
    return executeJobAssignment(input.tenantId, proposal.id, proposal.payload as ProposeJobPayload, input.actorUserId)
  }

  if (proposal.toolName === "draft_listing") {
    // Publish path is blocked in L.0 even if somehow approved
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
 * Reject leaves no side effects (no job, no notify).
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

  // Snapshot job count before reject — must not change
  const before = Number(
    (
      getDb()
        .prepare("SELECT COUNT(*) AS c FROM jobs WHERE tenant_id = ?")
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

  const after = Number(
    (
      getDb()
        .prepare("SELECT COUNT(*) AS c FROM jobs WHERE tenant_id = ?")
        .get(input.tenantId) as { c: number }
    ).c,
  )
  if (after !== before) {
    return { ok: false, error: "Invariant violated: reject mutated jobs." }
  }
  return { ok: true }
}

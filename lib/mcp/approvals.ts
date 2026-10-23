import {
  approveProposal,
  rejectProposal,
  type ExecuteResult,
} from "@/lib/agentic/executor"
import {
  getProposal,
  pendingProposals,
  proposalsForTenant,
  updateProposalPayload,
} from "@/lib/agentic/proposals"
import type { AgentProposal, ProposalStatus, ToolPayload } from "@/lib/agentic/types"
import { isNeverAuto, MCP_PROPOSE_SCOPE, neverAutoClassFor } from "@/lib/mcp/policy"
import type { McpSession } from "@/lib/mcp/session"

export type McpApprovalToolName = "approvals.list" | "approvals.get" | "approvals.resolve"

export type McpApprovalToolSpec = {
  name: McpApprovalToolName
  description: string
  mutating: boolean
  roleLevels: ReadonlyArray<number>
}

export const MCP_M1_APPROVAL_TOOLS: readonly McpApprovalToolSpec[] = [
  {
    name: "approvals.list",
    description: "List pending (or filtered) Ask Easy proposals for the session tenant.",
    mutating: false,
    roleLevels: [2, 3],
  },
  {
    name: "approvals.get",
    description: "Get one proposal preview + payload diffs for the session tenant.",
    mutating: false,
    roleLevels: [2, 3],
  },
  {
    name: "approvals.resolve",
    description:
      "Approve, reject, or edit a proposal. Approve is the only path that mutates never-auto tools. Reject = no side effect.",
    mutating: true,
    roleLevels: [2, 3],
  },
] as const

export type McpApprovalResult = {
  ok: boolean
  tool: McpApprovalToolName
  error?: string
  data?: unknown
}

export function approvalToolsForSession(session: McpSession): McpApprovalToolSpec[] {
  if (!session.userId || !session.tenantId) return []
  if (!session.scopes.includes(MCP_PROPOSE_SCOPE)) return []
  if (session.roleLevel == null) return []
  return MCP_M1_APPROVAL_TOOLS.filter((t) => t.roleLevels.includes(session.roleLevel as number))
}

export function canInvokeApprovalTool(session: McpSession, name: string): boolean {
  return approvalToolsForSession(session).some((t) => t.name === name)
}

function summarizeProposal(p: AgentProposal) {
  return {
    proposal_id: p.id,
    tool_name: p.toolName,
    status: p.status,
    preview: p.promptSummary,
    never_auto: isNeverAuto(p.toolName),
    never_auto_class: neverAutoClassFor(p.toolName),
    created_at: p.createdAt,
    created_by: p.createdBy,
    decided_by: p.decidedBy,
    decided_at: p.decidedAt,
    payload: p.payload,
    outcome_json: p.outcomeJson,
    error: p.error,
  }
}

export function invokeApprovalTool(
  session: McpSession,
  name: string,
  args: Record<string, unknown> = {},
): McpApprovalResult {
  if (!MCP_M1_APPROVAL_TOOLS.some((t) => t.name === name)) {
    return { ok: false, tool: name as McpApprovalToolName, error: `Unknown tool: ${name}` }
  }
  const tool = name as McpApprovalToolName
  if (!canInvokeApprovalTool(session, tool)) {
    return {
      ok: false,
      tool,
      error: `Tool not available for role_level=${session.roleLevel ?? "anonymous"} (${session.role}).`,
    }
  }
  if (!session.tenantId || !session.userId) {
    return { ok: false, tool, error: "Session tenant and user required." }
  }

  if ("tenant_id" in args || "tenantId" in args) {
    const supplied = args.tenant_id ?? args.tenantId
    if (supplied != null && supplied !== session.tenantId) {
      return {
        ok: false,
        tool,
        error: "tenant_id may not be supplied by the model; use session claims.",
      }
    }
  }

  switch (tool) {
    case "approvals.list":
      return listApprovals(session, args)
    case "approvals.get":
      return getApproval(session, args)
    case "approvals.resolve":
      return resolveApproval(session, args)
    default:
      return { ok: false, tool, error: `Unhandled tool: ${tool}` }
  }
}

function listApprovals(session: McpSession, args: Record<string, unknown>): McpApprovalResult {
  const statusRaw = typeof args.status === "string" ? args.status : "pending"
  const statuses: ProposalStatus[] | null =
    statusRaw === "all"
      ? null
      : statusRaw === "pending" ||
          statusRaw === "approved" ||
          statusRaw === "rejected" ||
          statusRaw === "executed" ||
          statusRaw === "failed"
        ? [statusRaw]
        : ["pending"]

  const rows = statuses
    ? proposalsForTenant(session.tenantId!, { status: statuses })
    : proposalsForTenant(session.tenantId!)

  return {
    ok: true,
    tool: "approvals.list",
    data: {
      tenantId: session.tenantId,
      count: rows.length,
      proposals: rows.map(summarizeProposal),
    },
  }
}

function getApproval(session: McpSession, args: Record<string, unknown>): McpApprovalResult {
  const proposalId =
    typeof args.proposal_id === "string"
      ? args.proposal_id
      : typeof args.proposalId === "string"
        ? args.proposalId
        : null
  if (!proposalId) {
    return { ok: false, tool: "approvals.get", error: "proposal_id is required." }
  }
  const proposal = getProposal(session.tenantId!, proposalId)
  if (!proposal) {
    // Cross-tenant or missing → not_found (no leak).
    return { ok: false, tool: "approvals.get", error: "not_found" }
  }
  return {
    ok: true,
    tool: "approvals.get",
    data: summarizeProposal(proposal),
  }
}

function resolveApproval(session: McpSession, args: Record<string, unknown>): McpApprovalResult {
  const proposalId =
    typeof args.proposal_id === "string"
      ? args.proposal_id
      : typeof args.proposalId === "string"
        ? args.proposalId
        : null
  if (!proposalId) {
    return { ok: false, tool: "approvals.resolve", error: "proposal_id is required." }
  }

  const decisionRaw =
    typeof args.decision === "string" ? args.decision.trim().toLowerCase() : ""
  if (decisionRaw !== "approve" && decisionRaw !== "reject" && decisionRaw !== "edit") {
    return {
      ok: false,
      tool: "approvals.resolve",
      error: "decision must be approve | reject | edit.",
    }
  }

  const existing = getProposal(session.tenantId!, proposalId)
  if (!existing) {
    return { ok: false, tool: "approvals.resolve", error: "not_found" }
  }

  if (decisionRaw === "edit") {
    const payload = args.payload
    if (!payload || typeof payload !== "object") {
      return {
        ok: false,
        tool: "approvals.resolve",
        error: "edit requires a payload object (merged into the pending proposal).",
      }
    }
    const updated = updateProposalPayload({
      tenantId: session.tenantId!,
      proposalId,
      actorUserId: session.userId!,
      payload: payload as ToolPayload,
      promptSummary: typeof args.prompt === "string" ? args.prompt : undefined,
    })
    if (!updated.ok) {
      return { ok: false, tool: "approvals.resolve", error: updated.error }
    }
    return {
      ok: true,
      tool: "approvals.resolve",
      data: {
        decision: "edit",
        proposal: summarizeProposal(updated.proposal),
        note: "Payload updated; proposal stays pending until approve.",
      },
    }
  }

  if (decisionRaw === "reject") {
    const rejected = rejectProposal({
      tenantId: session.tenantId!,
      proposalId,
      actorUserId: session.userId!,
    })
    if (!rejected.ok) {
      return { ok: false, tool: "approvals.resolve", error: rejected.error }
    }
    const after = getProposal(session.tenantId!, proposalId)
    return {
      ok: true,
      tool: "approvals.resolve",
      data: {
        decision: "reject",
        proposal: after ? summarizeProposal(after) : { proposal_id: proposalId, status: "rejected" },
        side_effects: false,
        note: "Reject = no side effect (eval invariant).",
      },
    }
  }

  // approve → only path that mutates never-auto tools
  const executed: ExecuteResult = approveProposal({
    tenantId: session.tenantId!,
    proposalId,
    actorUserId: session.userId!,
  })
  if (!executed.ok) {
    return {
      ok: false,
      tool: "approvals.resolve",
      error: executed.error,
      data: { code: executed.code, decision: "approve" },
    }
  }
  const after = getProposal(session.tenantId!, proposalId)
  return {
    ok: true,
    tool: "approvals.resolve",
    data: {
      decision: "approve",
      proposal: after ? summarizeProposal(after) : { proposal_id: proposalId, status: "executed" },
      execute: executed,
      never_auto: isNeverAuto(existing.toolName),
      note: "Approved and executed via shared Ask Easy hard gate.",
    },
  }
}

/** Pending count helper for tests / health. */
export function pendingCountForSession(session: McpSession): number {
  if (!session.tenantId) return 0
  return pendingProposals(session.tenantId).length
}

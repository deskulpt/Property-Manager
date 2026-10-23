import { dispatchTool, getTool, type ToolDispatchResult } from "@/lib/agentic/tools"
import type { AgentToolName } from "@/lib/agentic/types"
import {
  isNeverAuto,
  MCP_PROPOSE_SCOPE,
  neverAutoClassFor,
} from "@/lib/mcp/policy"
import type { McpSession } from "@/lib/mcp/session"

/** M1 mutating / soft-draft tools advertised on MCP (same registry as Ask Easy). */
export type McpM1MutateToolName =
  | "draft_listing"
  | "draft_rental_agreement"
  | "propose_job_assignment"
  | "propose_list_unit"
  | "propose_unlist_unit"
  | "propose_upsert_occupant_ledger"
  | "propose_upsert_lease_party"
  | "propose_esign_send"

export type McpMutateToolSpec = {
  name: McpM1MutateToolName
  description: string
  mutating: true
  /** Soft draft may apply unpublished fields; still returns proposal_id. */
  softDraft: boolean
  neverAuto: boolean
  roleLevels: ReadonlyArray<number>
}

export const MCP_M1_MUTATE_TOOLS: readonly McpMutateToolSpec[] = [
  {
    name: "draft_listing",
    description:
      "Soft-write unpublished listing draft fields. Returns proposal_id; never publishes.",
    mutating: true,
    softDraft: true,
    neverAuto: false,
    roleLevels: [2, 3],
  },
  {
    name: "draft_rental_agreement",
    description:
      "Draft a jurisdiction-aware rental agreement (IN/CA). Soft draft; not legal advice. Returns proposal_id.",
    mutating: true,
    softDraft: true,
    neverAuto: false,
    roleLevels: [2, 3],
  },
  {
    name: "propose_job_assignment",
    description:
      "Propose create+assign concierge job. Returns proposal_id — never auto-notifies (Approve required).",
    mutating: true,
    softDraft: false,
    neverAuto: true,
    roleLevels: [2, 3],
  },
  {
    name: "propose_list_unit",
    description:
      "Propose listing a unit as publicly available. Returns proposal_id — never auto-publishes.",
    mutating: true,
    softDraft: false,
    neverAuto: true,
    roleLevels: [2, 3],
  },
  {
    name: "propose_unlist_unit",
    description:
      "Propose delisting a unit (hold). Returns proposal_id — never auto-notifies.",
    mutating: true,
    softDraft: false,
    neverAuto: true,
    roleLevels: [2, 3],
  },
  {
    name: "propose_upsert_occupant_ledger",
    description:
      "Propose occupant + optional rent ledger seed. Returns proposal_id — money lines only after Approve.",
    mutating: true,
    softDraft: false,
    neverAuto: true,
    roleLevels: [2, 3],
  },
  {
    name: "propose_upsert_lease_party",
    description:
      "Propose primary/secondary/guarantor lease party. Returns proposal_id — Approve required.",
    mutating: true,
    softDraft: false,
    neverAuto: true,
    roleLevels: [2, 3],
  },
  {
    name: "propose_esign_send",
    description:
      "Propose eSign send for a draft agreement. Returns proposal_id — never auto-sends.",
    mutating: true,
    softDraft: false,
    neverAuto: true,
    roleLevels: [2, 3],
  },
] as const

export type McpMutateResult = {
  ok: boolean
  tool: McpM1MutateToolName
  error?: string
  data?: {
    proposal_id: string
    preview: string
    status: string
    never_auto: boolean
    never_auto_class: string | null
    soft_draft_applied?: boolean
    /** Extra tool-specific fields (draft id, agreement id, etc.). */
    detail?: Record<string, unknown>
  }
}

export function mutateToolsForSession(session: McpSession): McpMutateToolSpec[] {
  if (!session.userId || !session.tenantId) return []
  if (!session.scopes.includes(MCP_PROPOSE_SCOPE)) return []
  if (session.roleLevel == null) return []
  return MCP_M1_MUTATE_TOOLS.filter((t) => t.roleLevels.includes(session.roleLevel as number))
}

export function canInvokeMutateTool(session: McpSession, name: string): boolean {
  const spec = MCP_M1_MUTATE_TOOLS.find((t) => t.name === name)
  if (!spec) return false
  if (!session.userId || !session.tenantId) return false
  if (!session.scopes.includes(MCP_PROPOSE_SCOPE)) return false
  if (session.roleLevel == null || !spec.roleLevels.includes(session.roleLevel)) return false
  return true
}

/**
 * Invoke an M1 mutate / soft-draft tool via the shared Ask Easy registry.
 * Never-auto tools only enqueue — they never call executeApprovedProposal here.
 */
export function invokeMutateTool(
  session: McpSession,
  name: string,
  args: Record<string, unknown> = {},
): McpMutateResult {
  if (!MCP_M1_MUTATE_TOOLS.some((t) => t.name === name)) {
    return { ok: false, tool: name as McpM1MutateToolName, error: `Unknown mutate tool: ${name}` }
  }
  const tool = name as McpM1MutateToolName
  if (!canInvokeMutateTool(session, tool)) {
    return {
      ok: false,
      tool,
      error: `Tool not available for role_level=${session.roleLevel ?? "anonymous"} (${session.role}).`,
    }
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

  // Hard invariant: never-auto tools must go through proposal + Approve.
  // invokeMutateTool only dispatches to the registry (propose / soft draft) — never execute.
  if (isNeverAuto(tool) && getTool(tool as AgentToolName)?.requiresApproval !== true) {
    return {
      ok: false,
      tool,
      error: `Policy violation: ${tool} is never-auto but registry does not require approval.`,
    }
  }

  const prompt =
    typeof args.prompt === "string" && args.prompt.trim()
      ? args.prompt.trim()
      : typeof args.summary === "string" && args.summary.trim()
        ? args.summary.trim()
        : `MCP ${tool}`

  const propertyId =
    typeof args.propertyId === "string"
      ? args.propertyId
      : typeof args.property_id === "string"
        ? args.property_id
        : null
  const unitId =
    typeof args.unitId === "string"
      ? args.unitId
      : typeof args.unit_id === "string"
        ? args.unit_id
        : null

  const overrides = { ...args }
  delete overrides.tenant_id
  delete overrides.tenantId
  delete overrides.prompt
  delete overrides.summary

  const result = dispatchTool(
    tool as AgentToolName,
    {
      tenantId: session.tenantId!,
      userId: session.userId!,
      prompt,
      propertyId,
      unitId,
    },
    overrides,
  )

  return mapDispatchToMcp(tool, result)
}

function mapDispatchToMcp(tool: McpM1MutateToolName, result: ToolDispatchResult): McpMutateResult {
  if (result.kind === "error") {
    return { ok: false, tool, error: result.error }
  }

  const proposal =
    "proposal" in result && result.proposal
      ? result.proposal
      : null
  if (!proposal) {
    return { ok: false, tool, error: "Registry returned no proposal_id." }
  }

  const neverAuto = isNeverAuto(tool)
  const preview =
    "reply" in result && typeof result.reply === "string"
      ? result.reply
      : `Proposed ${tool} (${proposal.status}).`

  // Never-auto must remain pending until approvals.resolve / in-app Approve.
  if (neverAuto && proposal.status !== "pending") {
    return {
      ok: false,
      tool,
      error: `Never-auto tool ${tool} must return a pending proposal; got status=${proposal.status}.`,
    }
  }

  const detail: Record<string, unknown> = {
    toolName: proposal.toolName,
    payload: proposal.payload,
  }
  if (result.kind === "draft_listing" && "draft" in result) {
    detail.draftId = result.draft.id
    detail.published = result.draft.published
  }
  if (result.kind === "draft_rental_agreement" && "agreement" in result) {
    detail.agreementId = result.agreement.id
    detail.agreementStatus = result.agreement.status
  }

  return {
    ok: true,
    tool,
    data: {
      proposal_id: proposal.id,
      preview,
      status: proposal.status,
      never_auto: neverAuto,
      never_auto_class: neverAutoClassFor(tool),
      soft_draft_applied: !neverAuto && (proposal.status === "executed" || result.kind.startsWith("draft_")),
      detail,
    },
  }
}

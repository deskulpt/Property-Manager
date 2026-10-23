import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { McpSession } from "@/lib/mcp/session"
import {
  invokeMcpTool,
  toolsForSession,
  type McpToolName,
} from "@/lib/mcp/tools"

const emptyInput = {
  _unused: z.string().optional().describe("Unused placeholder"),
}

const searchInput = {
  q: z.string().optional().describe("Free-text query (area, building, unit)."),
  area: z.string().optional().describe("Market area filter, e.g. Bhiwandi."),
  status: z
    .enum(["available", "leased", "hold", "pending"])
    .optional()
    .describe("Unit status filter (default available)."),
}

const applicationInput = {
  applicationId: z.string().optional().describe("Optional application id; omit to list all in scope."),
}

const promptScopedInput = {
  prompt: z.string().optional().describe("Landlord intent / summary for the proposal."),
  propertyId: z.string().optional().describe("Optional property id (must belong to session tenant)."),
  unitId: z.string().optional().describe("Optional unit id (must belong to session tenant)."),
}

const proposeJobInput = {
  ...promptScopedInput,
  trade: z.enum(["electrician", "plumber", "courier", "cleaning"]).optional(),
  providerId: z.string().optional(),
  title: z.string().optional(),
  details: z.string().optional(),
}

const occupantLedgerInput = {
  ...promptScopedInput,
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  seedRentCents: z.number().optional(),
  dueOn: z.string().optional(),
  description: z.string().optional(),
}

const leasePartyInput = {
  ...promptScopedInput,
  role: z.enum(["primary", "secondary", "guarantor"]).optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
}

const esignInput = {
  ...promptScopedInput,
  agreementId: z.string().optional().describe("Draft agreement id to send."),
}

const draftAgreementInput = {
  ...promptScopedInput,
  country: z.string().optional(),
  region: z.string().optional(),
  lawNotes: z.string().optional(),
}

const approvalsListInput = {
  status: z
    .enum(["pending", "approved", "rejected", "executed", "failed", "all"])
    .optional()
    .describe("Filter (default pending)."),
}

const approvalsGetInput = {
  proposal_id: z.string().describe("Proposal id from a mutating tool."),
}

const approvalsResolveInput = {
  proposal_id: z.string().describe("Proposal id to resolve."),
  decision: z.enum(["approve", "reject", "edit"]).describe("Landlord decision."),
  payload: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Required for edit — replacement tool payload."),
  prompt: z.string().optional().describe("Optional updated prompt summary on edit."),
}

/**
 * Build an MCP server advertising M0 reads + M1 propose/approvals for this session.
 * Mutating tools return proposal_id; never-auto tools never silent-execute.
 */
export function createEasyRentalMcpServer(session: McpSession): McpServer {
  const server = new McpServer({
    name: "easy-rental",
    version: "0.2.0-m1",
  })

  const allowed = new Set(toolsForSession(session).map((t) => t.name))

  const register = (
    name: McpToolName,
    description: string,
    inputSchema: Record<string, z.ZodTypeAny>,
    opts?: { readOnly?: boolean; destructive?: boolean },
  ) => {
    if (!allowed.has(name)) return
    const readOnly = opts?.readOnly ?? true
    server.registerTool(
      name,
      {
        title: name,
        description,
        inputSchema,
        annotations: {
          readOnlyHint: readOnly,
          destructiveHint: opts?.destructive ?? false,
          idempotentHint: readOnly,
          openWorldHint: false,
        },
      },
      async (args) => {
        const result = invokeMcpTool(session, name, (args ?? {}) as Record<string, unknown>)
        const text = JSON.stringify(result, null, 2)
        if (!result.ok) {
          return {
            isError: true,
            content: [{ type: "text" as const, text }],
          }
        }
        return {
          content: [{ type: "text" as const, text }],
        }
      },
    )
  }

  // —— M0 reads ——
  register("search_listings", "Search available listings (catalog or tenant-scoped).", searchInput)
  register(
    "query_portfolio_summary",
    "Landlord portfolio rollup: occupancy, rent roll, open apps/jobs, ledger due.",
    emptyInput,
  )
  register(
    "query_ledger_summary",
    "Ledger summary for the session landlord org or signed-in occupant.",
    emptyInput,
  )
  register(
    "get_application_status",
    "Application status for applicant (own) or landlord (tenant inbox).",
    applicationInput,
  )
  register(
    "query_referral_status",
    "Refer & Earn pipeline for the session user (empty until Slice J).",
    emptyInput,
  )
  register("list_my_jobs", "Jobs assigned to the signed-in service provider.", emptyInput)
  register("cms_list_landlords", "CMS landlord org directory (platform staff).", emptyInput)
  register("cms_list_applicants", "CMS applicants list with role-based email masking.", emptyInput)
  register("cms_list_providers", "CMS service-provider directory.", emptyInput)

  // —— M1 soft drafts (may soft-apply unpublished; still return proposal_id) ——
  register(
    "draft_listing",
    "Soft-write unpublished listing draft. Returns proposal_id; never publishes.",
    promptScopedInput,
    { readOnly: false },
  )
  register(
    "draft_rental_agreement",
    "Draft IN/CA rental agreement (soft). Returns proposal_id; not legal advice.",
    draftAgreementInput,
    { readOnly: false },
  )

  // —— M1 never-auto proposes (proposal_id only; Approve via approvals.resolve or /landlord/ask) ——
  register(
    "propose_job_assignment",
    "Propose job assign. Returns proposal_id — never auto-notifies.",
    proposeJobInput,
    { readOnly: false, destructive: true },
  )
  register(
    "propose_list_unit",
    "Propose list unit publicly. Returns proposal_id — never auto-publishes.",
    promptScopedInput,
    { readOnly: false, destructive: true },
  )
  register(
    "propose_unlist_unit",
    "Propose delist unit. Returns proposal_id — never auto-notifies.",
    promptScopedInput,
    { readOnly: false, destructive: true },
  )
  register(
    "propose_upsert_occupant_ledger",
    "Propose occupant + ledger seed. Returns proposal_id — money only after Approve.",
    occupantLedgerInput,
    { readOnly: false, destructive: true },
  )
  register(
    "propose_upsert_lease_party",
    "Propose lease party. Returns proposal_id — Approve required.",
    leasePartyInput,
    { readOnly: false },
  )
  register(
    "propose_esign_send",
    "Propose eSign send. Returns proposal_id — never auto-sends.",
    esignInput,
    { readOnly: false, destructive: true },
  )

  // —— M1 approvals bridge ——
  register("approvals.list", "List Ask Easy proposals for the session tenant.", approvalsListInput)
  register("approvals.get", "Get one proposal preview + payload.", approvalsGetInput)
  register(
    "approvals.resolve",
    "Approve / reject / edit a proposal. Approve executes never-auto tools; reject = no side effect.",
    approvalsResolveInput,
    { readOnly: false, destructive: true },
  )

  return server
}

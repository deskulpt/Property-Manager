import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { McpSession } from "@/lib/mcp/session"
import { invokeM0Tool, toolsForSession, type McpM0ToolName } from "@/lib/mcp/tools"

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

/**
 * Build an MCP server advertising only the M0 tools allowed for this session.
 * All tools are read-only (mutating: false).
 */
export function createEasyRentalMcpServer(session: McpSession): McpServer {
  const server = new McpServer({
    name: "easy-rental",
    version: "0.1.0-m0",
  })

  const allowed = new Set(toolsForSession(session).map((t) => t.name))

  const register = (
    name: McpM0ToolName,
    description: string,
    inputSchema: Record<string, z.ZodTypeAny>,
  ) => {
    if (!allowed.has(name)) return
    server.registerTool(
      name,
      {
        title: name,
        description,
        inputSchema,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async (args) => {
        const result = invokeM0Tool(session, name, (args ?? {}) as Record<string, unknown>)
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

  return server
}

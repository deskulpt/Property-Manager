/**
 * Easy Rental MCP — Phase M0 (read-only).
 * Spec: docs/role-actions-mcp-surface.md §3–§5 · docs/agentic-e2e-infra.md
 *
 * Mutating tools / approvals.resolve are intentionally absent until M1/M2.
 */
export { roleLevelFor, roleLevelLabel, type RoleLevel } from "@/lib/mcp/role-level"
export {
  anonymousSession,
  sessionFromUser,
  resolveMcpToken,
  sessionFromRequestHeaders,
  bearerFromAuthorization,
  MCP_READ_SCOPE,
  type McpSession,
} from "@/lib/mcp/session"
export {
  MCP_M0_TOOLS,
  toolsForSession,
  canInvokeTool,
  invokeM0Tool,
  demoSession,
  type McpM0ToolName,
  type McpToolResult,
  type McpToolSpec,
} from "@/lib/mcp/tools"
export { createEasyRentalMcpServer } from "@/lib/mcp/server"

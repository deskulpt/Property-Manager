/**
 * Easy Rental MCP — Phase M1 (propose + approvals).
 * Spec: docs/role-actions-mcp-surface.md §3–§5 · docs/agentic-e2e-infra.md
 *
 * Mutating tools return proposal_id. Never-auto (money / lease send / notify /
 * publish / export / assign-notify) execute only via approvals.resolve or the
 * in-app Ask Easy queue — never silent from the model.
 */
export { roleLevelFor, roleLevelLabel, type RoleLevel } from "@/lib/mcp/role-level"
export {
  anonymousSession,
  sessionFromUser,
  resolveMcpToken,
  sessionFromRequestHeaders,
  bearerFromAuthorization,
  mcpDemoTokensAllowed,
  MCP_READ_SCOPE,
  MCP_PROPOSE_SCOPE,
  MCP_EXECUTE_PREAUTH_SCOPE,
  type McpSession,
} from "@/lib/mcp/session"
export {
  assertDistinctApprover,
  assertDualControlApprove,
  proposalBindingHash,
  proposalContentDigest,
  proposalExpiresAtIso,
  amountCadCentsFromProposal,
  dualControlAuditCsvHeader,
  DUAL_CONTROL_REFUND_THRESHOLD_CAD_CENTS,
  DUAL_CONTROL_APPROVER_DAILY_CAP_CAD_CENTS,
  DUAL_CONTROL_FINANCE_POLICY_VERSION,
} from "@/lib/mcp/dual-control"
export {
  issueMcpAccessToken,
  revokeMcpAccessToken,
  introspectMcpAccessToken,
  resolveStoredMcpToken,
  listMcpAccessTokensForTenant,
  mcpOauthMetadata,
  MCP_TOKEN_PREFIX,
  MCP_TOKEN_AUDIENCE_DEFAULT,
} from "@/lib/mcp/oauth-tokens"
export {
  MCP_HOST_CERT_MATRIX,
  hostCertById,
  certifiedHosts,
  assertNoFalseHostClaims,
  type McpHostCertRow,
  type HostCertStatus,
} from "@/lib/mcp/host-cert-matrix"
export {
  isNeverAuto,
  isSoftDraft,
  maySilentExecute,
  neverAutoClassFor,
  NEVER_AUTO_TOOLS,
  SOFT_DRAFT_TOOLS,
  type NeverAutoClass,
} from "@/lib/mcp/policy"
export {
  MCP_M0_TOOLS,
  MCP_M1_MUTATE_TOOLS,
  MCP_M1_APPROVAL_TOOLS,
  toolsForSession,
  toolsForSessionM0,
  canInvokeTool,
  invokeM0Tool,
  invokeMcpTool,
  invokeMutateTool,
  invokeApprovalTool,
  demoSession,
  type McpM0ToolName,
  type McpM1MutateToolName,
  type McpApprovalToolName,
  type McpToolName,
  type McpToolResult,
  type McpToolSpec,
  type McpAnyToolSpec,
} from "@/lib/mcp/tools"
export { createEasyRentalMcpServer } from "@/lib/mcp/server"

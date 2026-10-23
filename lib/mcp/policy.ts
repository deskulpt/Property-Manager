/**
 * MCP / Ask Easy never-auto policy (agentic-e2e-infra.md §5 · role-actions-mcp-surface.md §3.3).
 *
 * Model output is intent only. These classes always enqueue a pending proposal —
 * even when the session carries `execute:preauthorized` (M2 narrow drafts only).
 */

export const MCP_PROPOSE_SCOPE = "propose:*" as const
export const MCP_EXECUTE_PREAUTH_SCOPE = "execute:preauthorized" as const

/** Product never-auto classes (docs). */
export type NeverAutoClass =
  | "money"
  | "lease_send"
  | "notify"
  | "publish"
  | "export"
  | "assign_notify"

/**
 * Tool names that must never silent-execute.
 * Includes registry tools today plus reserved names for later packs.
 */
export const NEVER_AUTO_TOOLS: ReadonlySet<string> = new Set([
  // Money
  "propose_upsert_occupant_ledger",
  "propose_ledger_charge",
  "propose_assess_late_fee",
  "propose_record_payment",
  "propose_shop_checkout",
  "propose_upi_mandate",
  "propose_enach",
  "propose_razorpay_settings",
  // Lease / e-sign send
  "propose_esign_send",
  // Notify / assign-notify
  "propose_job_assignment",
  "propose_send_reminder",
  "create_concierge_job",
  // Publish / public visibility
  "propose_publish_listing",
  "propose_list_unit",
  "propose_unlist_unit",
  // Export / off-tenant share
  "propose_export_report",
])

/** Soft drafts may apply without Approve (still tenant-scoped; never publish/send). */
export const SOFT_DRAFT_TOOLS: ReadonlySet<string> = new Set([
  "draft_listing",
  "draft_rental_agreement",
  "draft_reminder",
  "draft_lease_packet",
])

export function isNeverAuto(toolName: string): boolean {
  return NEVER_AUTO_TOOLS.has(toolName)
}

export function isSoftDraft(toolName: string): boolean {
  return SOFT_DRAFT_TOOLS.has(toolName)
}

/**
 * Silent execute is never allowed for never-auto tools.
 * Soft drafts may soft-apply via the shared Ask Easy registry without Approve.
 * `execute:preauthorized` does not unlock money / lease / notify / publish.
 */
export function maySilentExecute(toolName: string, scopes: readonly string[]): boolean {
  if (isNeverAuto(toolName)) return false
  if (!isSoftDraft(toolName)) return false
  // Soft drafts soft-apply via dispatchTool regardless of preauth — preauth is for M2
  // non-never-auto drafts only; never-auto stays blocked above.
  void scopes
  return true
}

export function neverAutoClassFor(toolName: string): NeverAutoClass | null {
  if (!isNeverAuto(toolName)) return null
  if (
    toolName.includes("ledger") ||
    toolName.includes("payment") ||
    toolName.includes("charge") ||
    toolName.includes("checkout") ||
    toolName.includes("mandate") ||
    toolName.includes("enach") ||
    toolName.includes("razorpay") ||
    toolName.includes("late_fee")
  ) {
    return "money"
  }
  if (toolName.includes("esign") || toolName.includes("lease_packet")) return "lease_send"
  if (toolName.includes("job") || toolName.includes("reminder") || toolName.includes("notify")) {
    return toolName.includes("job") ? "assign_notify" : "notify"
  }
  if (toolName.includes("publish") || toolName.includes("list_unit") || toolName.includes("unlist")) {
    return "publish"
  }
  if (toolName.includes("export")) return "export"
  return "notify"
}

/**
 * D07 — assistant host certification matrix (start).
 *
 * "Certified" requires a recorded sandbox run: auth → read → draft → propose →
 * human approve → execute, against the current MCP transport. Untested hosts
 * must not be advertised as supported.
 */

export type HostCertStatus =
  | "certified"
  | "in_progress"
  | "transport_only"
  | "unverified"
  | "blocked"

export type McpHostCertRow = {
  hostId: string
  displayName: string
  transport: "streamable_http" | "stdio" | "unknown" | "vendor_plugin"
  authModel: "oauth_pat" | "env_pat_map" | "demo_local" | "unknown"
  status: HostCertStatus
  /** Short honest note — never claim certification without a test id. */
  notes: string
  lastTestedAt: string | null
  testIds: readonly string[]
}

export const MCP_HOST_CERT_MATRIX: readonly McpHostCertRow[] = [
  {
    hostId: "cursor-mcp",
    displayName: "Cursor MCP",
    transport: "stdio",
    authModel: "env_pat_map",
    status: "in_progress",
    notes:
      "stdio package + Streamable HTTP route exist; production OAuth/PAT store landing this slice. No recorded external host sandbox cert yet.",
    lastTestedAt: null,
    testIds: ["test/mcp-m0.test.ts", "test/mcp-m1.test.ts", "test/mcp-oauth-tokens.test.ts"],
  },
  {
    hostId: "claude-desktop-mcp",
    displayName: "Claude Desktop / MCP hosts",
    transport: "streamable_http",
    authModel: "oauth_pat",
    status: "transport_only",
    notes: "Remote HTTP endpoint present; host-specific OAuth discovery + approval UX uncertified.",
    lastTestedAt: null,
    testIds: ["e2e/mcp-m1.spec.ts"],
  },
  {
    hostId: "grok-bot",
    displayName: "Grok Bot",
    transport: "unknown",
    authModel: "unknown",
    status: "unverified",
    notes: "Do not advertise. Verify official product + account access before naming supported.",
    lastTestedAt: null,
    testIds: [],
  },
  {
    hostId: "muse",
    displayName: "Muse",
    transport: "unknown",
    authModel: "unknown",
    status: "unverified",
    notes: "Do not advertise. Vendor identity / consent UX unverified.",
    lastTestedAt: null,
    testIds: [],
  },
  {
    hostId: "dots-chatgpt",
    displayName: "Dots / ChatGPT connector",
    transport: "vendor_plugin",
    authModel: "unknown",
    status: "unverified",
    notes: "No assumed custom MCP. Confirm official integration model first.",
    lastTestedAt: null,
    testIds: [],
  },
] as const

export function hostCertById(hostId: string): McpHostCertRow | null {
  return MCP_HOST_CERT_MATRIX.find((h) => h.hostId === hostId) ?? null
}

export function certifiedHosts(): McpHostCertRow[] {
  return MCP_HOST_CERT_MATRIX.filter((h) => h.status === "certified")
}

export function assertNoFalseHostClaims(): { ok: true } | { ok: false; offenders: string[] } {
  const offenders = certifiedHosts().map((h) => h.hostId)
  // Matrix start: zero certified until a recorded sandbox run lands.
  if (offenders.length > 0) {
    return { ok: false, offenders }
  }
  return { ok: true }
}

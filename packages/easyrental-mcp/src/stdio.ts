import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { createEasyRentalMcpServer } from "@/lib/mcp/server"
import { resolveMcpToken } from "@/lib/mcp/session"

/**
 * Start M1 MCP over stdio (reads + propose/approvals). Session from
 * EASYRENTAL_MCP_DEFAULT_TOKEN (e.g. demo:u_nadia) or anonymous when unset.
 */
export async function startStdioMcp() {
  const token = process.env.EASYRENTAL_MCP_DEFAULT_TOKEN ?? process.env.EASYRENTAL_MCP_TOKEN ?? null
  const session = resolveMcpToken(token)
  const server = createEasyRentalMcpServer(session)
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

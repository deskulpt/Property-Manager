import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { createEasyRentalMcpServer } from "@/lib/mcp/server"
import { sessionFromRequestHeaders } from "@/lib/mcp/session"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * MCP Streamable HTTP endpoint (M0 reads + M1 propose/approvals; JSON, stateless).
 * Auth: Authorization: Bearer demo:u_nadia  (or x-easyrental-mcp-token)
 */
async function handle(req: Request): Promise<Response> {
  const session = sessionFromRequestHeaders(req.headers)
  const server = createEasyRentalMcpServer(session)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)
  try {
    return await transport.handleRequest(req)
  } finally {
    await server.close().catch(() => undefined)
  }
}

export async function POST(req: Request) {
  return handle(req)
}

export async function GET(req: Request) {
  return handle(req)
}

export async function DELETE(req: Request) {
  return handle(req)
}

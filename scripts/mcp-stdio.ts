/**
 * Easy Rental MCP M1 — stdio entry (run via `npm run mcp:stdio`).
 * Auth: EASYRENTAL_MCP_DEFAULT_TOKEN=demo:u_nadia
 */
import { startStdioMcp } from "../packages/easyrental-mcp/src/stdio"

startStdioMcp().catch((err) => {
  console.error(err)
  process.exit(1)
})

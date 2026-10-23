# `@easyrental/mcp` — M0 read-only MCP

Phase **M0** Easy Rental MCP server for ChatGPT / Claude / Cursor.

- **Read tools only** — no mutate, no `approvals.resolve` (that is M1/M2).
- Session claims: `tenant_id` + `role_level` from OAuth/PAT **stub** — never from model args.
- Same product surface as [role-actions-mcp-surface.md](../../docs) / Ask Easy registry policy.

## Tools (role-filtered)

| Tool | Who |
| --- | --- |
| `search_listings` | Anonymous + all roles (landlord/agent tenant-scoped) |
| `query_portfolio_summary` | L2 landlord, L3 managing agent |
| `query_ledger_summary` | L2 landlord, L4 applicant/occupant |
| `get_application_status` | L2/L3 landlord desk, L4 applicant |
| `query_referral_status` | Authenticated (empty until Slice J) |
| `list_my_jobs` | L5 service provider |
| `cms_list_landlords` / `cms_list_applicants` / `cms_list_providers` | L0/L1 platform staff (seat-gated) |

## Auth stub

```bash
export EASYRENTAL_MCP_DEFAULT_TOKEN=demo:u_nadia   # landlord BBM
# or:
export EASYRENTAL_MCP_TOKENS='{"my-pat":"u_avery"}'
export EASYRENTAL_MCP_DEFAULT_TOKEN=my-pat
```

HTTP endpoint also accepts `Authorization: Bearer demo:u_nadia`.

## Run stdio (Cursor / Claude Desktop)

From the Property-Manager repo root (after `npm install`):

```bash
npm run mcp:stdio
# or
EASYRENTAL_MCP_DEFAULT_TOKEN=demo:u_nadia node packages/easyrental-mcp/bin/easyrental-mcp.mjs
```

Cursor MCP config example:

```json
{
  "mcpServers": {
    "easy-rental": {
      "command": "node",
      "args": ["packages/easyrental-mcp/bin/easyrental-mcp.mjs"],
      "cwd": "/path/to/Property-Manager",
      "env": {
        "EASYRENTAL_MCP_DEFAULT_TOKEN": "demo:u_nadia"
      }
    }
  }
}
```

## HTTP

With the Next app running: `POST /api/mcp` (Streamable HTTP, JSON responses). Pass Bearer token.

## Never-auto (future M1+)

Money, lease/eSign send, notify, publish, export, assign-notify stay proposal-gated — not exposed in M0.

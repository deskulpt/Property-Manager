# Easy Rental MCP — M0 read-only (wire when URL is set)

**M0 shipped** in the Property-Manager app:

| Surface | Path |
| --- | --- |
| Tool + session core | `lib/mcp/` (read-only; `tenant_id` + `role_level` from PAT/session stub) |
| stdio package | `packages/easyrental-mcp` · `npm run mcp:stdio` |
| HTTP | `POST /api/mcp` (Streamable HTTP, Bearer `demo:<userId>`) |

Spec: Project store `docs/role-actions-mcp-surface.md` §3–§5 · `docs/mcp-m0.md`.
Same isolation policy as Ask Easy (`lib/agentic`). **No mutate tools in M0.**

Never-auto (M1+): money, eSign send, notify, publish, export, assign-notify.
Auth claims from OAuth/session — never model text for `tenant_id`.

When `EASY_RENTAL_MCP_URL` points at a running desk (`https://…/api/mcp`), add
`bot/mcp-connections/easy-rental.ts`:

```ts
import { defineConnection } from "@grok/agent-sdk/connections";

export default defineConnection({
  url: "${EASY_RENTAL_MCP_URL}",
  oauth: true,
  advertiseTools: true,
});
```

Do not commit a live `defineConnection` until that URL exists — discovery
requires a real default export and would fail validate otherwise.

Local smoke without BDK connection:

```bash
# repo root
EASYRENTAL_MCP_DEFAULT_TOKEN=demo:u_nadia npm run mcp:stdio
```

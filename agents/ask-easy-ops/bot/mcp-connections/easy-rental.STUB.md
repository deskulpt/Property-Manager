# Easy Rental MCP — not wired in v1

Playground + HTTP + server tools only. Future remote MCP should use the
**same tool registry** as Ask Easy (see Project store
`docs/role-actions-mcp-surface.md` §3–§5: M0 read → M1 propose → M2
`approvals.resolve`).

Never-auto: money, eSign send, notify, publish, export, assign-notify.
Auth claims from OAuth/session — never model text for `tenant_id`.

When `EASY_RENTAL_MCP_URL` is live, add `bot/mcp-connections/easy-rental.ts`:

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

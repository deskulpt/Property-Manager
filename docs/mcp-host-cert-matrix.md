# MCP host certification matrix (D07 — start)

**Status:** In progress · zero hosts **certified**  
**Parent:** Unified PRD §8 · Eng D07  
**Related code:** `lib/mcp/host-cert-matrix.ts`, `lib/mcp/oauth-tokens.ts`

## Rule

Do **not** advertise an assistant host as supported until a recorded sandbox run covers:

`auth → read → draft → propose → distinct-human approve → execute`

against the current MCP transport + tenant-bound token model.

## Matrix

| Host | Transport | Auth | Status | Notes |
| --- | --- | --- | --- | --- |
| Cursor MCP | stdio | env PAT map / `er_pat_*` | in_progress | Local tests exist; no recorded external cert id yet |
| Claude Desktop / MCP hosts | streamable HTTP | OAuth PAT | transport_only | `/api/mcp` present; host OAuth discovery Pending |
| Grok Bot | unknown | unknown | unverified | Do not advertise |
| Muse | unknown | unknown | unverified | Do not advertise |
| Dots / ChatGPT connector | vendor plugin | unknown | unverified | No assumed custom MCP |

## Production auth (this slice)

| Piece | Behaviour |
| --- | --- |
| Opaque PAT | `er_pat_*` hashed in `mcp_access_tokens`; tenant + user bound server-side |
| Issue | `POST /api/mcp/oauth/token` (cookie session exchange) |
| Revoke | `POST /api/mcp/oauth/revoke` |
| Introspect | `POST /api/mcp/oauth/introspect` |
| Demo tokens | Fail-closed in `production` / `HOSTED` unless dual opt-in |
| Live money | Flags OFF — synthetic demo only |

Full OAuth 2.1 authorization-code + PKCE + protected-resource metadata remains **Pending**.

## Cannot be toggled off

See Eng progress note LEGAL / FINANCE / TECH — never-auto money/lease_send, distinct approver, tenant-from-grant, and Finance CAD policy are not weakenable feature flags.

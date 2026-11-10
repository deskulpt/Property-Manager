# Merge order — #45 / #46 / #47 (when green)

Aloke: **build behind toggles, don’t block.** All three PRs are independent stacks on `main`; live money/compliance flags stay **OFF**.

## Recommended order (when CI green + mergeable)

1. **#46** — CTO security gates (`cursor/cto-security-gates-543d`)  
   Smallest money/markets coupling. Land authz / MCP / D09 / model-PII gates first.
2. **#47** — Country paths `/in` `/ca` (`cursor/country-path-in-ca-1de0`)  
   Owns CountryPack schema, `taxRegistrationId`, and canonical `LEGAL_FEATURE_FLAG_KEYS` used by Admin compliance console.
3. **#45** — CFO billing/tax (`cursor/cfo-review-pricing-tax-0ae5`)  
   Rebase/restack after #47 so Ontario statement helpers keep reading pack tax id and money flag **names** stay aligned with Admin console. Do **not** merge #44.

## Why this order

| Pair | Overlap | Notes |
| --- | --- | --- |
| #45 ↔ #46 | `lib/agentic/index.ts`, `package.json`, `test/ask-easy.test.ts` | Light — security first reduces auth surprises under billing demos |
| #45 ↔ #47 | `lib/markets/packs.ts`, `types.ts`, `lib/actions.ts`, e2e | Pack + flag catalog should land before billing consumers |
| #46 ↔ #47 | `lib/seed-demo.ts`, `package.json` | Light |

## Flag contract (shared with Admin compliance)

Canonical keys live in `lib/markets/legal-flags.ts` (`LEGAL_FEATURE_FLAG_KEYS`). Billing re-exports the same names; permanent CA locks (`tenantCardConvenienceFee`, `quebecCardSurcharge`) and reserved `in-pay` / `ca-pay` stay OFF and are not CountryPack toggles.

## Status snapshot

Check Origin `ciState` / `mergeability` before merging; re-verify after each land and restack the next PR onto updated `main`.

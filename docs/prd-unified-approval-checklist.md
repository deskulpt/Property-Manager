# Unified PRD v1.0 — Owner approval checklist (D01–D15)

**For:** Aloke (product owner) · legal · finance as marked  
**Source:** [`prd-unified-proposed-v1.md`](./prd-unified-proposed-v1.md) §19  
**Decisions register:** [`prd-decisions-d01-d15.md`](./prd-decisions-d01-d15.md)  
**Repo:** `docs/prd-unified-v1.md` (partial mirror; see Approved? column)  
**Date:** 7 Nov 2026  

Status of document: **PARTIAL**. Product/eng rows below marked Approved may proceed for R1 honesty work. **D11 / D12 / D13 / D15 are NOT approved** — CFO tax/billing review owns applying changes ([CFO tax billing review](bc-3f8cac08-2361-5d34-aa26-13b6bcee0ae5)). Do not invent live money; never-auto stays fail-closed. Do not merge PR #44 until CFO stacks or supersedes.

| ID  | Decision                                                                                                           | Owner                   | Approved?     | Notes / decision |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------- | ---------------- |
| D01 | Canonical charging meter, billable-unit definition, free tier, proration, lock renewal and enterprise volume terms | Aloke + finance         | Approved      | Per billable unit/month; free=1 unit; volume 6–20 15%, 21–50 25%; >50=enterprise quote; sale window keep; GST treatment subject to CFO tax review. Kill per-property/year cards. |
| D02 | Ask Easy / API / MCP / automation package entitlements; do not infer all from one existing flag                    | Aloke                   | Approved      | Free none AI; Growth `assistant.read`; Pro+ draft/propose; Enterprise + `automation.policies` + `mcp.access` + `api.access`. Soft-open demo OK labelled. |
| D03 | Whether R1 and R1A launch together; exact truthful commercial promise                                              | Aloke                   | Approved      | Ship R1 first; market R1A only when standing policies land; do not advertise autonomous ops yet. |
| D04 | Supported property profiles and specialist-profile exclusions at launch                                            | Aloke                   | Approved      | Launch: residential, office, retail, warehouse/industrial, storage, mixed-use. Hospitality/medical discovery-only. |
| D05 | Postgres cutover versus risk-accepted single-instance pilot; recovery objectives                                   | Aloke + eng             | Approved      | Keep SQLite for demo/pilot with risk label; Postgres = migration design + spike PR, not big-bang this sprint. |
| D06 | Production model provider, data handling, provider cost budget and fallback behavior                               | Aloke + eng             | Approved      | Keep stub/fallback; production model env-gated; no fake “live AI” claims. |
| D07 | First tested assistant hosts and exact integration support                                                         | Aloke + eng             | Approved      | First host to certify: Cursor/Claude remote MCP only; Grok/Muse/Dots unsupported until tested. |
| D08 | Standing-authority policy update replacing categorical never-auto behavior for bounded routines                    | Aloke + security        | Approved      | Keep never-auto fail-closed; A3 scaffolding tables/flag OFF only — no silent bypass. |
| D09 | Which actions need two independent humans versus ordinary user confirmation                                        | Aloke + security        | Approved      | Dual-control: payouts, large refunds, privileged export, legal notices; else requesting human OK. |
| D10 | Billing, notification, KYC, e-sign, messaging and workflow vendors                                                 | Aloke + finance         | Pending CFO   | Keep demo adapters; live vendors remain go-live keys (ER-8). MoR/tax vendor choices may move with CFO review. |
| D11 | Service fee, commission, seller/MoR and refund/dispute model by country                                            | Aloke + legal + finance | **Not approved** | Owned by CFO tax billing review. Do not treat prior “no rent skim / Dodo-PayPal” notes as final. |
| D12 | Affiliate terms including proposed 20% schedule; partner licensing review                                          | Aloke + legal           | **Not approved** | Owned by CFO tax billing review. 20% schedule stays DOCUMENTED only until CFO/legal close. |
| D13 | Country enablement and tax/compliance review process                                                               | Aloke + legal + finance | **Not approved** | Owned by CFO tax billing review. India/Canada/tax process subject to CFO pack. |
| D14 | UI framework direction and design consistency; not conflated with security readiness                               | Aloke                   | Approved      | DaisyUI + Tailwind PWA (tip) — keep; no shadcn revert. |
| D15 | Media requirements, rights and publication override policy per profile                                             | Aloke + legal           | **Not approved** | Owned by CFO/legal follow-through with tax/billing sibling if in scope; Matterport optional notes are proposals only until closed. |

## Coordination — PR #44

- **PR:** [#44](https://cursor.com/codebase/deskulpt/Property-Manager/pull/44) — **leave open; do not merge**
- **Head:** `cursor/d01-d02-pricing-entitlements-6564` @ `bac3779`
- **Rebase / stack base for CFO:** branch tip `bac3779` (or stack Origin PR on #44)
- **Owner for tax+pricing apply:** [CFO tax billing review](bc-3f8cac08-2361-5d34-aa26-13b6bcee0ae5)

## After critical decisions

1. Unified PRD full APPROVED only when D11–D13 (+ D15 / D10 as finance requires) close via CFO pack — until then treat product-approved rows only.
2. Reconcile repository money/tax docs when CFO changes land (stacked on or superseding #44).
3. Agents follow this checklist over stale “all Approved” chat text.

# Unified PRD v1.0 — Owner approval checklist (D01–D15)

**For:** Aloke (product owner) · legal · finance as marked  
**Source:** [`prd-unified-proposed-v1.md`](./prd-unified-proposed-v1.md) §19  
**Decisions register:** [`prd-decisions-d01-d15.md`](./prd-decisions-d01-d15.md)  
**Repo:** `docs/prd-unified-v1.md` (APPROVED mirror)  
**Date:** 6 Nov 2026  

Status of document: **APPROVED** (owner sign-off). Agents follow the decisions register + approved unified PRD. Implementation still must not invent live money or weaken never-auto.

| ID  | Decision                                                                                                           | Owner                   | Approved? | Notes / decision |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------------------- | --------- | ---------------- |
| D01 | Canonical charging meter, billable-unit definition, free tier, proration, lock renewal and enterprise volume terms | Aloke + finance         | Approved  | Per billable unit/month (`homes`/`retail_office`/`industrial`); free=1 unit; volume 6–20 15%, 21–50 25%; >50=enterprise quote; sale window keep; 18% GST India adapter only. Kill per-property/year cards. |
| D02 | Ask Easy / API / MCP / automation package entitlements; do not infer all from one existing flag                    | Aloke                   | Approved  | Free none AI; Growth `assistant.read`; Pro+ draft/propose; Enterprise + `automation.policies` + `mcp.access` + `api.access`. Soft-open demo OK labelled. |
| D03 | Whether R1 and R1A launch together; exact truthful commercial promise                                              | Aloke                   | Approved  | Ship R1 first; market R1A only when standing policies land; do not advertise autonomous ops yet. |
| D04 | Supported property profiles and specialist-profile exclusions at launch                                            | Aloke                   | Approved  | Launch: residential, office, retail, warehouse/industrial, storage, mixed-use. Hospitality/medical discovery-only. |
| D05 | Postgres cutover versus risk-accepted single-instance pilot; recovery objectives                                   | Aloke + eng             | Approved  | Keep SQLite for demo/pilot with risk label; Postgres = migration design + spike PR, not big-bang this sprint. |
| D06 | Production model provider, data handling, provider cost budget and fallback behavior                               | Aloke + eng             | Approved  | Keep stub/fallback; production model env-gated; no fake “live AI” claims. |
| D07 | First tested assistant hosts and exact integration support                                                         | Aloke + eng             | Approved  | First host to certify: Cursor/Claude remote MCP only; Grok/Muse/Dots unsupported until tested. |
| D08 | Standing-authority policy update replacing categorical never-auto behavior for bounded routines                    | Aloke + security        | Approved  | Keep never-auto fail-closed; A3 scaffolding tables/flag OFF only — no silent bypass. |
| D09 | Which actions need two independent humans versus ordinary user confirmation                                        | Aloke + security        | Approved  | Dual-control: payouts, large refunds, privileged export, legal notices; else requesting human OK. |
| D10 | Billing, notification, KYC, e-sign, messaging and workflow vendors                                                 | Aloke + finance         | Approved  | Keep demo adapters; live vendors remain go-live keys (ER-8). |
| D11 | Service fee, commission, seller/MoR and refund/dispute model by country                                            | Aloke + legal + finance | Approved  | No rent skim; services = flat/disclosed commission later; MoR = Dodo/PayPal path already stubbed. |
| D12 | Affiliate terms including proposed 20% schedule; partner licensing review                                          | Aloke + legal           | Approved  | Affiliate 20% proposal stays DOCUMENTED not activated. |
| D13 | Country enablement and tax/compliance review process                                                               | Aloke + legal + finance | Approved  | India live; Canada parked; process = L0 CountryPack checklist. |
| D14 | UI framework direction and design consistency; not conflated with security readiness                               | Aloke                   | Approved  | DaisyUI + Tailwind PWA (tip) — keep; no shadcn revert. |
| D15 | Media requirements, rights and publication override policy per profile                                             | Aloke + legal           | Approved  | Matterport/360 optional per profile; residential stills-only publish OK. |

## After all critical decisions

1. Mark `prd-unified-proposed-v1.md` status from PROPOSED → **APPROVED** (version bump as needed). → **in progress this change**
2. Reconcile repository `docs/prd.md`, `docs/business-model-money.md`, `docs/architecture.md`, and backlog in one reviewed change. → **in progress this change**
3. Agents then follow the approved unified PRD — not fragmented chat specifications.

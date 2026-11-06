# D01–D15 decisions register (DECIDED)

**Status:** Owner-authorized (Aloke Approved on checklist) · **Date:** 6 Nov 2026  
**Authority:** Unified PRD [`prd-unified-proposed-v1.md`](./prd-unified-proposed-v1.md) §19 · R0 matrix [`capability-matrix-r0.md`](./capability-matrix-r0.md) · Checklist [`prd-unified-approval-checklist.md`](./prd-unified-approval-checklist.md)  
**Tip evidence pin:** Origin `7808188` · GitHub mirror `5ca1b25` (Ask Easy floating island)  
**Companion implementation:** Phase B vertical slice = D01+D02 pricing meter + entitlement reconcile (this sprint).

Evidence labels: **OBSERVED** (tip code) · **DOCUMENTED** (store/repo docs) · **NORM** (India SaaS / market practice) · **SPEC** (official MCP docs cited).

---

## D01 — Canonical charging meter

**DECIDED:** Canonical meter = **per billable unit / month** by segment (`homes` / `retail_office` / `industrial`) from `lib/billing/pricing.ts`. Kill contradictory **per-property / year** public cards in `lib/plans.ts` displays. Free = **1 unit**. Volume: **6–20 → 15%**, **21–50 → 25%**; **>50 = enterprise quote (not 0% self-serve)**. Keep sale window + 500-account cap. **18% GST** is an **India adapter only** (`GST_BPS = 1800`).

| Evidence | Detail |
| --- | --- |
| OBSERVED | `lib/billing/pricing.ts`: `STANDARD_MONTHLY_PAISE` Homes ₹299 / R&O ₹699 / Industrial ₹1,999; sale ₹149/₹349/₹999; `FREE_PLAN_MAX_UNITS = 1`; sale 1 Dec 2026–31 Mar 2027 IST; `volumeDiscountPct` 15/25; tip returns **0% above 50** today — commercial fix required |
| OBSERVED conflict | `lib/plans.ts` `PUBLIC_PLANS` still ₹499/₹1,499/₹2,999 **per active listed property / year** (`proposed: true`); `/pricing` renders both meters (R0 C1) |
| DOCUMENTED | Store money doc + USP matrix: landlord SaaS, free seekers, No Broker!; NoBroker learnings reject seeker contact packs as primary revenue ([learnings-nobroker-commercial-plans.md](./learnings-nobroker-commercial-plans.md), [usp-competitive-listings-in-ca-us.md](./usp-competitive-listings-in-ca-us.md)) |
| NORM | India B2B SaaS often quotes **ex-GST** with **18% GST** at invoice; annual = prepaid discount framing (tip uses 10× monthly) |

**Implementation notes:** Single public story = unit catalogue + package entitlements. Package ladder (Free/Growth/Pro/Enterprise) gates features, **not** a second money meter. `>50` units → `enterprise_quote` path (sales), never silent 0% volume.

---

## D02 — Entitlements (Ask Easy / API / MCP / automation)

**DECIDED:** Split entitlements (do not infer all from one `askEasy` flag):

| Package | Entitlements |
| --- | --- |
| Free (`starter`) | none AI |
| Growth | `assistant.read` |
| Pro | `assistant.read` + `assistant.draft` + `assistant.propose` |
| Enterprise | Pro + `automation.policies` + `mcp.access` + `api.access` |

Soft-open demo gate **OK if labelled** (demo / evaluator path). Production / `ASK_EASY_REQUIRE_PRO=1` enforces package entitlements via `tenants.package` (not the absent `subscription_package` column).

| Evidence | Detail |
| --- | --- |
| OBSERVED | `PLAN_LIMITS.askEasy` true only for pro/enterprise; `lib/agentic/gate.ts` soft-opens because it looks for `subscription_package` while schema has `package` (R0 C2) |
| DOCUMENTED | Unified PRD §0.2 #5 / §3: define each entitlement explicitly; Ask Easy ≠ MCP access |
| SPEC | MCP hosts need separate auth/transport certification ([modelcontextprotocol.io](https://modelcontextprotocol.io/), OWASP MCP cheat sheet cited in unified PRD §22) |

---

## D03 — R1 vs R1A

**DECIDED:** Ship **R1 first**. Market **R1A only** when standing policies land. Do **not** advertise autonomous ops yet.

| Evidence | Detail |
| --- | --- |
| OBSERVED | Never-auto intact in `lib/mcp/policy.ts`; standing-policy tables **ABSENT** (R0 §1.8) |
| DOCUMENTED | Unified PRD §16: R1 vs R1A; R0 Step 0 leaves D08 fail-closed |

---

## D04 — Property profiles at launch

**DECIDED:** Launch profiles: **residential, office, retail, warehouse/industrial, storage, mixed-use**. **Hospitality / medical = discovery-only** until dedicated packs.

| Evidence | Detail |
| --- | --- |
| OBSERVED | Tip segments warehouse/commercial/residential (+ subtypes); storage/mixed incomplete (R0 C4) |
| DOCUMENTED | Unified PRD §2.1 profile matrix |

---

## D05 — Persistence

**DECIDED:** Keep **SQLite** for demo/pilot with **explicit risk label**. Postgres = migration design + spike PR path — **not** big-bang cutover this sprint.

| Evidence | Detail |
| --- | --- |
| OBSERVED | `node:sqlite` `DatabaseSync`; SEED_VERSION wipe-reseed (R0 §1.1) |
| DOCUMENTED | Launch readiness / railway docs: volume SQLite near-term |

---

## D06 — Model provider

**DECIDED:** Keep stub/fallback. Production model provider = **env-gated**. No fake “live AI” claims.

| Evidence | Detail |
| --- | --- |
| OBSERVED | Ask Easy stub model path; ADK/gemini adapters env-gated (R0 §1.8) |
| DOCUMENTED | [go-live-dependencies.md](./go-live-dependencies.md) lists `GEMINI_API_KEY` as soft |

---

## D07 — First MCP host

**DECIDED:** First host to certify: **Cursor / Claude remote MCP only**. Grok / Muse / Dots = **unsupported until tested**.

| Evidence | Detail |
| --- | --- |
| OBSERVED | MCP M0/M1 + `demo:` tokens; no external host contract test (R0 C7) |
| DOCUMENTED | Unified PRD §0.2 #6 / §8.2 host table; §22 MCP spec URL |
| SPEC | Official MCP remote HTTP + OAuth discovery; do not invent host transports |

---

## D08 — Never-auto / standing authority

**DECIDED:** Keep **never-auto fail-closed**. A3 scaffolding (tables/flag **OFF**) only — **no silent bypass**.

| Evidence | Detail |
| --- | --- |
| OBSERVED | `NEVER_AUTO_TOOLS` + `maySilentExecute` fail-closed (R0 §1.8) |
| DOCUMENTED | Unified PRD §0.2 #8: standing auth needs approved policy revision |

---

## D09 — Dual-control

**DECIDED:** Dual-control (two independent humans) for: **payouts, large refunds, privileged export, legal notices**. Else requesting human confirmation is OK.

| Evidence | Detail |
| --- | --- |
| OBSERVED | Approver = session user today; dual-control matrix incomplete (R0 C9) |
| DOCUMENTED | Unified PRD §0.2 #9 |

---

## D10 — Vendors

**DECIDED:** Keep **demo adapters**. Live vendors remain **go-live keys** ([go-live-dependencies.md](./go-live-dependencies.md) / ER-8).

| Evidence | Detail |
| --- | --- |
| OBSERVED | Billing/OTP/KYC/eSign/notifications DEMO/STUB (R0 §1.2, §1.9) |

---

## D11 — Fees / MoR

**DECIDED:** **No rent skim**. Services = flat / disclosed commission **later**. MoR = **Dodo / PayPal** path already stubbed.

| Evidence | Detail |
| --- | --- |
| OBSERVED | `lib/billing/routing.ts` IN→dodo / non-IN→paypal; shop demo |
| DOCUMENTED | Money doc §1; competitor Nestaway take-rate is **not** our model ([usp-competitive-listings-in-ca-us.md](./usp-competitive-listings-in-ca-us.md)) |

---

## D12 — Affiliate

**DECIDED:** Affiliate **20%** proposal stays **DOCUMENTED not activated**.

| Evidence | Detail |
| --- | --- |
| DOCUMENTED | Money doc + Refer & Earn briefs; counsel/tax review still required |

---

## D13 — Countries

**DECIDED:** **India live**; **Canada parked**; process = **L0 CountryPack checklist** before promote-to-live claims.

| Evidence | Detail |
| --- | --- |
| OBSERVED | IN pack live; CA draft/promoteable but MoR/tax still demo (R0 §1.5) |

---

## D14 — UI framework

**DECIDED:** **DaisyUI + Tailwind PWA** (already on tip) — **keep**. No shadcn revert. Residual shadcn primitives may remain until migrated; new chrome follows DaisyUI.

| Evidence | Detail |
| --- | --- |
| OBSERVED | Tip `7808188` DaisyUI desks + Ask Easy island; dual stack residual (R0 §1.9) |

---

## D15 — Media / Matterport

**DECIDED:** Matterport / 360 **optional per profile**. Residential **stills-only publish OK**.

| Evidence | Detail |
| --- | --- |
| OBSERVED | Matterport URL optional on units (R0 §1.5) |
| DOCUMENTED | Unified PRD §0.2 #10 |

---

## Phase B build scope (this authorization)

**In scope:** D01+D02 code reconcile — single pricing meter on public/plan cards; entitlement flags; tests; honest soft-open label; docs APPROVED bump + money/prd pointer reconcile.

**Out of scope this sprint (explicit):** R1A autonomy, live MoR charges, Postgres cutover, host MCP certification beyond Cursor/Claude claim discipline, affiliate activation, Canada live, A3 execute ON, inventing live money.

---

*End decisions register.*

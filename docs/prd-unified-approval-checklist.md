# Unified PRD v1.1 — Multi-approver checklist (D01–D15)

**PR:** [#45](https://cursor.com/codebase/deskulpt/Property-Manager/pull/45) · **Decisions:** [`prd-decisions-d01-d15.md`](./prd-decisions-d01-d15.md) · **Summary:** [`advisor-vs-aloke-approval-summary.md`](./advisor-vs-aloke-approval-summary.md)  
**Date:** 7 Nov 2026 (Aloke Approve with advisors’ changes on D11/D12/D13/D15)

### Approver rules

- **Aloke** = product owner + final approver on all D01–D15.
- Per-approver: `Pending` | `Approve` | `Approve with changes` | `Approve with advisors' changes` | `Reject` | `N/A`.
- **Fully approved** only when Aloke has signed **and** all required advisor conditions/gates are met (flags may stay OFF until then).
- Legal = conditional advisory only — not licensed go-live auth.
- **Advisor gates/flags remain OFF** as conditions (Connect live, Route, deposits, tenant card fee, real-PII AI, affiliate, etc.).

### Aloke 7 Nov — D11 / D12 / D13 / D15

| ID | Aloke status | Fully approved? |
| --- | --- | --- |
| D11 | **Approve with advisors' changes** | **No** — Finance/Legal/Eng conditions + flags OFF |
| D12 | **Approve with advisors' changes** | **No** — affiliate inactive / Legal–Finance gates |
| D13 | **Approve with advisors' changes** | **No** — production feature-gated; entity/GST/counsel |
| D15 | **Approve with advisors' changes** | **No** — Matterport add-on/BYO; media/PII gates |

Aloke’s approval is **recorded**. These are **not** fully approved until advisor conditions are satisfied.

### Entities (Aloke)

**GST/HST # checklist item: resolved** (sourced from this PRD; used in Ontario landlord statements + application-fee HST lines + `lib/billing/tax-identity.ts`). Flags stay OFF.


| Entity                              | Note                                               |
| ----------------------------------- | -------------------------------------------------- |
| **Deskulpt Inc**                    | Federal Canada; 739660629RT0001 **GST/HST number** — **resolved**; wired into CountryPack CA `taxRegistrationId` (#47); `caStripeTaxHst` **OFF** |
| **Deskulpt Commerce India Pvt Ltd** | Indian subsidiary (planned)                        |
| Indian CA / lawyers                 | **Not yet engaged**                                |

### Ontario pricing (CFO hybrid — config, not final)

CA$3–5/unit/mo + 0.5–1% rent fee capped CA$15/unit/mo + CA$10/mo min on payments plans.

### Refunds (CFO D09 — Finance Approve; Eng Reject open)

2nd approver if refund >CAD500 or >1 mo sub; 2-person payout/deposit release; no self-approve; CAD2k/day/approver; audit log. Flag/production dual-control still Eng-blocked.

### AI (Aloke + prior Legal/Eng)

Cloudflare **AI Gateway** + free **Workers AI** + **daily neuron limits**; **real PII blocked** until data-handling reviewed. Flag `realPiiAiConnectorsMedia` OFF.

### Country paths (Aloke · D13-related · flags OFF)

`/in` + `/ca` via CountryPack; root picker never auto-redirects; config-only for `/us`/`/br`.  
Pack entities: **Deskulpt Inc** (CA federal) · **Deskulpt Commerce India Pvt Ltd** (IN).  
AI: Cloudflare AI Gateway + Workers AI + neuron limits; real PII blocked.  
Implementation: **Country path routing** PR (`cursor/country-path-in-ca-1de0`).

### Still OFF (advisor conditions)

`ontarioConnectDirectPad` · Route/deposits · tenant card convenience fee (permanent) · Quebec card surcharge · affiliate · real-PII AI/media · e-store/concierge · `inTaxMatrix` · `caStripeTaxHst` · `razorpayIndianEntity` until gates.

---

| ID | Aloke | Legal | Finance | Eng | Fully? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| D01 | Approve ⚑ | AwC | AwC | AwC | **No** | |
| D02 | Approve ⚑ | AwC | AwC | AwC | **No** | AI Gateway / Workers AI / neuron limits; real PII blocked |
| D03 | Approve ⚑ | Approve | Approve | AwC | **No** | |
| D04 | Approve ⚑ | AwC | N/A | AwC | **No** | |
| D05 | Approve ⚑ | AwC | AwC | AwC | **No** | |
| D06 | Approve ⚑ | AwC | AwC | AwC | **No** | + Cloudflare AI path; real PII blocked |
| D07 | Approve ⚑✖ | AwC | Approve | **Reject** | **No** | |
| D08 | Approve ⚑ | Approve | Approve | AwC | **No** | |
| D09 | Approve ⚑✖ | AwC | **Approve** | **Reject** | **No** | CFO refund dual-control policy recorded |
| D10 | Pending | AwC | AwC | AwC | **No** | |
| D11 | **Approve w/ advisors' changes** ⚑ | AwC design/test | AwC | AwC | **No** | Connect DIRECT+PAD; live flags OFF |
| D12 | **Approve w/ advisors' changes** ⚑ | AwC | AwC | AwC | **No** | Affiliate OFF |
| D13 | **Approve w/ advisors' changes** ⚑ | AwC | AwC | AwC | **No** | TG+ON; production feature-gated; Deskulpt Commerce India Pvt Ltd |
| D14 | Approve ⚑ | AwC | N/A | AwC | **No** | |
| D15 | **Approve w/ advisors' changes** ⚑ | AwC | AwC | AwC | **No** | Matterport add-on/BYO; media caps |

**Fully approved today: 0.**

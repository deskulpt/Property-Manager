# Unified PRD v1.1 — Multi-approver checklist (D01–D15)

**PR:** [#45](https://cursor.com/codebase/deskulpt/Property-Manager/pull/45) · `cursor/cfo-review-pricing-tax-0ae5`  
**Decisions:** [`prd-decisions-d01-d15.md`](./prd-decisions-d01-d15.md) · **Summary:** [`advisor-vs-aloke-approval-summary.md`](./advisor-vs-aloke-approval-summary.md)  
**Date:** 7 Nov 2026 (Finance D11 Ontario AwC)

### Hard rules

- **D11 / D12 / D13 / D15 not Aloke-approved.**
- Legal = conditional advisory only.
- Fully approved today: **0**.

### Aloke — `/in` + `/ca` CountryPack paths (not Approve on D11–D15)

Config CountryPack routes `/in` and `/ca`. **Owned by sibling [Country path routing]** (separate PR). Billing/#45 cross-links only.

### Finance D11 (Ontario) — Approve with changes (flag OFF)

Legal ON **tenant-fee / provider-reg still pending** → `ontarioConnectDirectPad` **OFF**.

| Rule | Detail |
| --- | --- |
| Rent rail | **Stripe Connect DIRECT** on landlord connected account (**not** destination / separate charges) |
| Method | Rent by **PAD** |
| Deskulpt revenue | **Application fee only**, includes **13% HST** |
| Statements | Monthly landlord statement with Deskulpt **GST/HST number** |
| Tenants | **No fees to tenants** |
| Disputes | Reverse application fee if PAD disputed |
| Other markets | Separate invoice path remains **without** Connect |
| Pricing (config-only, **not final**) | CA$3–5/unit/mo + 0.5–1% payments fee capped CA$15/unit/mo + CA$10/mo min per landlord on payments plans |

### Aloke Indian-entity direction (not Approve on gated IDs)

Indian entity will register for Razorpay · Razorpay keyed to IN-entity merchant · Stripe = CA subscriptions · Route/deposit holds OFF until entity + Razorpay acceptance + Legal.

---

| ID | Aloke | Legal | Finance | Eng | Fully? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| D01–D08 | (prior) | (prior) | (prior) | D07 Reject | **No** | |
| D09 | Approve ⚑✖ | AwC | **Approve** | **Reject** | **No** | |
| D10 | Pending | AwC | AwC | AwC | **No** | |
| D11 | Pending ◇ | AwC | **AwC (ON model)** | AwC | **No** | **Not Aloke-approved.** ON Connect DIRECT+PAD documented; flag OFF pending Legal tenant-fee/provider-reg |
| D12 | Pending ◇ | AwC | AwC | AwC | **No** | **Not Aloke-approved** |
| D13 | Pending ◇ | AwC | AwC | AwC | **No** | **Not Aloke-approved** |
| D14 | Approve ⚑ | AwC | N/A | AwC | **No** | |
| D15 | Pending ◇ | AwC | AwC | AwC | **No** | **Not Aloke-approved** |

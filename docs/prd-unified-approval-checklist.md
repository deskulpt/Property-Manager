# Unified PRD v1.1 — Multi-approver checklist (D01–D15)

**For:** Aloke (product owner + **final approver on every decision**) · Legal (CA&Legal) · Finance (CFO) · Eng/Security (CTO)  
**Decisions register:** [`prd-decisions-d01-d15.md`](./prd-decisions-d01-d15.md)  
**CFO / Legal notes:** [`cfo-review-applied-nov7.md`](./cfo-review-applied-nov7.md) · [`advisor-vs-aloke-approval-summary.md`](./advisor-vs-aloke-approval-summary.md)  
**PR:** [#45](https://cursor.com/codebase/deskulpt/Property-Manager/pull/45) (`cursor/cfo-review-pricing-tax-0ae5`)  
**Date:** 7 Nov 2026 (Aloke Indian-entity Razorpay decision)

### Hard rules

- **D11 / D12 / D13 / D15 remain not Aloke-approved** (this decision is owner direction only).
- Legal = conditional advisory only — not licensed go-live auth.
- Fully approved only when Aloke + all required advisors signed. **Fully approved today: 0.**

### Aloke decision — Indian entity + Razorpay (owner direction — NOT Approve on D11/D13)

| Topic | Decision |
| --- | --- |
| Indian entity | **Will be registered** for Razorpay |
| Razorpay integration | Keyed to **Indian-entity merchant account** |
| Canada subscriptions | **Stripe** (Deskulpt Canada) — unchanged |
| Route splits | Behind flags — **OFF** until (1) entity exists (2) Razorpay written acceptance (3) Legal sign-off |
| Deposit holds | Behind flags — **OFF** until same three gates |

### OPEN Legal ↔ CFO (narrowed)

| Side | Position |
| --- | --- |
| **Legal** | CA Stripe may support UPI — needs verify |
| **Aloke / CFO path (IN)** | Indian-entity Razorpay; Route/deposits flagged OFF until 3 gates |
| **Code follows** | Aloke Indian-entity Razorpay **design**; flags OFF; Stripe = CA subscriptions |

CA rent via Stripe UPI remains **OPEN** if Legal verifies — do not enable without Finance+Legal close.

### Feature flags OFF (until gates / specialist review)

Route rent splits · platform fund pooling · deposit holds · mandatory tenant surcharges · e-store · concierge · affiliate · real-PII AI/connectors/media.

---

| ID | Aloke | Legal | Finance | Eng | Fully approved? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| D01 | Approve ⚑ | AwC | AwC | AwC | **No** | Stripe Tax CA; IN RC |
| D02 | Approve ⚑ | AwC | AwC | AwC | **No** | |
| D03 | Approve ⚑ | Approve | Approve | AwC | **No** | |
| D04 | Approve ⚑ | AwC | N/A | AwC | **No** | |
| D05 | Approve ⚑ | AwC | AwC | AwC | **No** | |
| D06 | Approve ⚑ | AwC | AwC | AwC | **No** | |
| D07 | Approve ⚑✖ | AwC | Approve | **Reject** | **No** | |
| D08 | Approve ⚑ | Approve | Approve | AwC | **No** | |
| D09 | Approve ⚑✖ | AwC | **Approve** | **Reject** | **No** | |
| D10 | Pending | AwC | AwC | AwC | **No** | + Route/deposit 3-gate |
| D11 | Pending ◇ | AwC | AwC | AwC | **No** | **Not Aloke-approved.** Indian entity + Razorpay design; Route/deposits OFF until gates |
| D12 | Pending ◇ | AwC | AwC | AwC | **No** | **Not Aloke-approved** |
| D13 | Pending ◇ | **AwC** | AwC | AwC | **No** | **Not Aloke-approved.** “Telangana and Ontario selected; synthetic demos allowed; production gated by feature.” Entity registration supports TG gate |
| D14 | Approve ⚑ | AwC | N/A | AwC | **No** | |
| D15 | Pending ◇ | AwC | AwC | AwC | **No** | **Not Aloke-approved** |

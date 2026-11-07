# Unified PRD v1.1 — Multi-approver checklist (D01–D15)

**For:** Aloke (product owner + **final approver on every decision**) · Legal (CA&Legal) · Finance (CFO) · Eng/Security (CTO)  
**Source:** [`prd-unified-proposed-v1.md`](./prd-unified-proposed-v1.md) §19  
**Decisions register:** [`prd-decisions-d01-d15.md`](./prd-decisions-d01-d15.md)  
**CFO apply:** [`cfo-review-applied-nov7.md`](./cfo-review-applied-nov7.md) · **Advisor vs Aloke:** [`advisor-vs-aloke-approval-summary.md`](./advisor-vs-aloke-approval-summary.md)  
**Repo mirror:** `docs/prd-unified-approval-checklist.md` · **PR:** [#45](https://cursor.com/codebase/deskulpt/Property-Manager/pull/45) (`cursor/cfo-review-pricing-tax-0ae5`)  
**Stack base:** `039b379` — **do not merge #44**  
**Eng checklist commit:** `16a549b9f53f0d3f749f8b3094e5a140ddc26665`  
**Date:** 7 Nov 2026 (Legal update pass)

### Approver rules

- **Aloke** = product owner + final approver on **all** D01–D15.
- Per-approver status only: `Pending` | `Approve` | `Approve with changes` | `Reject` | `N/A`.
- **Fully approved** only when Aloke **and** every required advisor have signed.
- **D11 / D12 / D13 / D15 remain not Aloke-approved** — BM answers are owner direction only.

### Legal column caveat

Legal = **conditional advisory / internal compliance review only** — **NOT** licensed legal sign-off, solicitor opinion, or go-live authorization. Qualified local counsel + tax/payment specialists must clear P0 gates.

### OPEN conflict — Legal ↔ CFO (rent rails)

| Side | Position |
| --- | --- |
| **Legal** | Canadian Stripe account **may** support UPI — **needs verify** with Stripe |
| **CFO / Aloke BM** | Rent on **landlord-owned Razorpay/UPI**; Deskulpt never touches rent; **no Route** |

**Status: OPEN** — do not code Stripe-as-rent-rail until Legal↔CFO resolve. Current code follows CFO/BM (landlord-owned rails; Stripe = subscriptions only).

### Aloke BM (owner direction — not Approve on gated IDs)

Deskulpt Canadian · subscriptions **Stripe** · rent landlord UPI/Razorpay · % surcharge separate invoice after settlement · launch **Telangana + Ontario** · templates/storage/eSign + landlord legal review · open to Indian director.

### Legal feature-flag rule (OFF until written Razorpay acceptance + specialist review)

Keep **OFF**: Route rent splits · platform fund pooling · deposit holds · mandatory tenant surcharges · e-store · concierge · affiliate.

### Legal market notes

| Market | Legal AwC points |
| --- | --- |
| **Ontario** | No generic damage deposits for **RTA residential**; use **prescribed standard lease**; eSign OK; **notice service** is separate |
| **Telangana** | Disclaimers **≠** stamp/registration; **no “compliant” claims** for e-signed leases |
| **Tax** | Replace blanket 18% GST with **CA-approved matrix**; overseas OIDAR may need IN GST reg; registered biz → **RC**; Ontario HST incl. CAD30k small-supplier rules |
| **AI / connectors / media** | Blocked for **real PII** until vendor/DPA/retention review |
| **Subscriptions** | Subscription-only SaaS (Stripe; Deskulpt **direct seller**; no outside MoR) can be assessed **separately** from rent rails |

---

| ID | Decision (short) | Required | Aloke | Legal | Finance (CFO) | Eng/Security | Fully approved? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D01 | Meter, volume, tax | Aloke, Finance, Legal, Eng | Approve ⚑ | Approve with changes | Approve with changes | Approve with changes | **No** | Stripe Tax HST + IN RC; CA-approved tax matrix (no blanket 18% GST) |
| D02 | Entitlements + AI | Aloke, Finance, Eng, Legal | Approve ⚑ | Approve with changes | Approve with changes | Approve with changes | **No** | Real-PII AI blocked until vendor/DPA/retention |
| D03 | R1 vs R1A | Aloke, Finance, Eng | Approve ⚑ | Approve | Approve | Approve with changes | **No** | |
| D04 | Profiles | Aloke, Eng, Legal | Approve ⚑ | Approve with changes | N/A | Approve with changes | **No** | ON/TG lease/deposit rules by use |
| D05 | Persistence | Aloke, Eng, Finance, Legal | Approve ⚑ | Approve with changes | Approve with changes | Approve with changes | **No** | |
| D06 | Model + caps | Aloke, Eng, Finance, Legal | Approve ⚑ | Approve with changes | Approve with changes | Approve with changes | **No** | Real-PII AI blocked |
| D07 | MCP host | Aloke, Eng, Finance, Legal | Approve ⚑✖ | Approve with changes | Approve | **Reject** | **No** | Eng Reject |
| D08 | Never-auto | Aloke, Eng, Finance | Approve ⚑ | Approve | Approve | Approve with changes | **No** | |
| D09 | Dual-control | Aloke, Eng, Finance, Legal | Approve ⚑✖ | Approve with changes | **Approve** | **Reject** | **No** | Finance Approve; Eng Reject |
| D10 | Go-live | Aloke, Finance, Legal, Eng | Pending | Approve with changes | Approve with changes | Approve with changes | **No** | Feature flags OFF until Razorpay acceptance + specialist review where applicable |
| D11 | Fees / rent / surcharge | Aloke, Finance, Legal, Eng | Pending ◇ | Approve with changes | **Approve with changes** | Approve with changes | **No** | **Not Aloke-approved.** OPEN Legal↔CFO on Stripe UPI vs landlord Razorpay. No Route; no deposit holds; surcharge not mandatory-tenant |
| D12 | Affiliate | Aloke, Legal, Finance, Eng | Pending ◇ | Approve with changes | Approve with changes | Approve with changes | **No** | **Not Aloke-approved.** Flag OFF |
| D13 | Country enablement | Aloke, Legal, Finance, Eng | Pending ◇ | **Approve with changes** | **Approve with changes** | Approve with changes | **No** | **Not Aloke-approved.** Legal wording: “Telangana and Ontario selected; synthetic demos allowed; production gated by feature.” |
| D14 | UI | Aloke, Eng, Legal | Approve ⚑ | Approve with changes | N/A | Approve with changes | **No** | |
| D15 | Media / Matterport | Aloke, Legal, Eng, Finance | Pending ◇ | Approve with changes | Approve with changes | Approve with changes | **No** | **Not Aloke-approved.** Real-PII media blocked until DPA/retention |

### P0 launch gates

1. IN tax specialist (OIDAR/RC/PE) + CA-approved tax matrix  
2. Documented fund flows (subscriptions vs rent vs surcharge); resolve **Legal↔CFO Stripe UPI** conflict  
3. ON RTA + TG stamp/registration feature gates  
4. Privacy/security for live data/AI/MCP  

**Scope:** synthetic-data demo until gates close. Fully approved today: **0**.

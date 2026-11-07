# Unified PRD v1.1 — Multi-approver checklist (D01–D15)

**For:** Aloke (product owner + **final approver on every decision**) · Legal (CA&Legal) · Finance (CFO) · Eng/Security (CTO)  
**Source:** [`prd-unified-proposed-v1.md`](./prd-unified-proposed-v1.md) §19  
**Decisions register:** [`prd-decisions-d01-d15.md`](./prd-decisions-d01-d15.md)  
**CFO apply:** [`cfo-review-applied-nov7.md`](./cfo-review-applied-nov7.md) · **Advisor vs Aloke:** [`advisor-vs-aloke-approval-summary.md`](./advisor-vs-aloke-approval-summary.md)  
**Repo mirror:** `docs/prd-unified-approval-checklist.md` · **PR:** [#45](https://cursor.com/codebase/deskulpt/Property-Manager/pull/45) (`cursor/cfo-review-pricing-tax-0ae5`)  
**Stack base:** `039b379` — **do not merge #44**  
**Eng checklist commit:** `16a549b9f53f0d3f749f8b3094e5a140ddc26665` (baseline GH main `5ca1b25` — checklist absent)  
**Date:** 7 Nov 2026 (BM + CFO Stripe path update)

### Approver rules

- **Aloke** = product owner + final approver on **all** D01–D15.
- Per-approver status only: `Pending` | `Approve` | `Approve with changes` | `Reject` | `N/A`.
- **Fully approved** only when Aloke **and** every required advisor have signed.
- Aloke’s existing Approve marks on product rows are **preserved** where noted. **D11 / D12 / D13 / D15 remain not Aloke-approved** — BM answers below are **owner direction**, not Aloke Approve on those gated IDs.
- **Legal update pending** — Legal column left as previously recorded; do not invent new Legal statuses this pass. Where Legal was unset → `Pending`.

### Legal column caveat

Legal = internal conditional compliance review only — **NOT** licensed legal sign-off or go-live auth.

### Aloke business-model answers (owner direction — **not** Aloke Approve on D11/D12/D13/D15)

| Topic | Aloke answer |
| --- | --- |
| Entity | Deskulpt Inc is **Canadian** |
| Subscriptions | Via **Stripe** (Deskulpt charges landlords for SaaS) |
| Rent | Tenants pay landlords’ own **UPI / Razorpay** accounts — **Deskulpt never touches rent** |
| Platform take | **% surcharge** billed to landlord **after** rent settles — **separate invoice** (not Route / not split from rent) |
| Launch markets | **Telangana + Ontario** |
| EasyRental role | Templates / storage / eSign only — **landlord legal review** required for lease content |
| India entity | **Open to Indian director** if needed |

### CFO blockers / rejects (7 Nov update)

| Item | CFO |
| --- | --- |
| Razorpay Route / linked accounts / splits | **BLOCKER — do not build.** Landlords own Razorpay/UPI. |
| Holding deposits on Deskulpt books | **REJECT** — landlord or licensed escrow only |
| Subscription tax path | **Stripe + Stripe Tax** (Stripe = **processor**; Deskulpt files/remits). D01: Stripe Tax for CA HST; India reverse charge when GSTIN present |
| Surcharge | Separate Stripe invoice after settlement; auto card/mandate; disclosed % — **not** Route |

---

| ID | Decision (short) | Required | Aloke | Legal | Finance (CFO) | Eng/Security | Fully approved? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D01 | Meter, graduated volume, tax, annual prepay | Aloke, Finance, Legal, Eng | Approve ⚑ | Approve with changes | Approve with changes | Approve with changes | **No** | Tax: **Stripe Tax** HST (ON) + India **RC with GSTIN**; Stripe=processor, Deskulpt remits; graduated volume; no stack |
| D02 | Entitlements + AI meter | Aloke, Finance, Eng, Legal | Approve ⚑ | Approve with changes | Approve with changes | Approve with changes | **No** | Unchanged advisor set |
| D03 | R1 vs R1A | Aloke, Finance, Eng | Approve ⚑ | Approve | Approve | Approve with changes | **No** | R1 must include billing |
| D04 | Profiles | Aloke, Eng, Legal | Approve ⚑ | Approve with changes | N/A | Approve with changes | **No** | |
| D05 | Postgres / SQLite | Aloke, Eng, Finance, Legal | Approve ⚑ | Approve with changes | Approve with changes | Approve with changes | **No** | |
| D06 | Model + caps | Aloke, Eng, Finance, Legal | Approve ⚑ | Approve with changes | Approve with changes | Approve with changes | **No** | |
| D07 | MCP host | Aloke, Eng, Finance, Legal | Approve ⚑✖ | Approve with changes | Approve | **Reject** | **No** | Eng Reject stands |
| D08 | Never-auto | Aloke, Eng, Finance | Approve ⚑ | Approve | Approve | Approve with changes | **No** | |
| D09 | Dual-control | Aloke, Eng, Finance, Legal | Approve ⚑✖ | Approve with changes | **Approve** | **Reject** | **No** | **Finance → Approve** (override prior AwC): refunds >CAD500 or >1 mo sub; every payout/deposit release = two people; no self-approve; CAD2k/day/approver; audit log. Eng Reject still blocks full approval |
| D10 | Vendors / go-live | Aloke, Finance, Legal, Eng | Pending | Approve with changes | Approve with changes | Approve with changes | **No** | Gate: live Stripe Tax rates + Stripe agreement + KYC DPA + test invoice; **no Route** |
| D11 | Fees / rent / surcharge | Aloke, Finance, Legal, Eng | Pending ◇ | Approve with changes | **Approve with changes** | Approve with changes | **No** | **Not Aloke-approved.** Finance AwC **conditional**: (1) no Route/splits (2) deposits not held. Stripe processor + surcharge separate invoice; rent on landlord UPI/Razorpay |
| D12 | Affiliate | Aloke, Legal, Finance, Eng | Pending ◇ | Approve with changes | Approve with changes | Approve with changes | **No** | **Not Aloke-approved.** Documented inactive |
| D13 | Country enablement | Aloke, Legal, Finance, Eng | Pending ◇✖ | **Reject** | **Approve with changes** | Approve with changes | **No** | **Not Aloke-approved.** Finance AwC: **Ontario first**; **Telangana gated** on entity+GST Qs. Legal Reject wording still applies until re-review |
| D14 | UI | Aloke, Eng, Legal | Approve ⚑ | Approve with changes | N/A | Approve with changes | **No** | |
| D15 | Media / Matterport | Aloke, Legal, Eng, Finance | Pending ◇ | Approve with changes | Approve with changes | Approve with changes | **No** | **Not Aloke-approved** |

### P0 launch gates (owner approval ≠ replace)

1. IN tax specialist (OIDAR / RC / PE) — Telangana gated; Indian director option open  
2. Documented fund flows — subscriptions (Stripe) vs rent (landlord Razorpay/UPI) vs surcharge (separate Stripe invoice); **no Route; no Deskulpt-held deposits**  
3. State/province lease gates (Telangana + Ontario)  
4. Privacy + security review for live data / AI / MCP  

**Scope until closed:** synthetic-data demo.

### Hard rules

- No live money until D10 + P0 gates  
- Never-auto fail-closed (D08)  
- **Do not** mark D11/D12/D13/D15 Aloke-approved  
- **Do not** build Razorpay Route / linked accounts / splits  
- **Do not** hold deposits on Deskulpt books  
- **Do not merge #44**

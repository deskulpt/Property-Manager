# Unified PRD v1.1 — Multi-approver checklist (D01–D15)

**For:** Aloke (product owner + **final approver on every decision**) · Legal (CA&Legal) · Finance (CFO) · Eng/Security (CTO)  
**Source:** [`prd-unified-proposed-v1.md`](./prd-unified-proposed-v1.md) §19  
**Decisions register:** [`prd-decisions-d01-d15.md`](./prd-decisions-d01-d15.md)  
**CFO apply:** [`cfo-review-applied-nov7.md`](./cfo-review-applied-nov7.md) · **Advisor vs Aloke:** [`advisor-vs-aloke-approval-summary.md`](./advisor-vs-aloke-approval-summary.md)  
**Repo mirror:** `docs/prd-unified-approval-checklist.md`  
**Stack base:** `cursor/d01-d02-pricing-entitlements-6564` @ `039b379` — **do not merge #44**  
**Checklist commit (link when recording Eng review):** **`16a549b9f53f0d3f749f8b3094e5a140ddc26665`** on `cursor/cfo-review-pricing-tax-0ae5` (Eng review baseline GH main `5ca1b25` — checklist was absent there)  
**Eng review baseline:** GH `main` @ `5ca1b25` (checklist **absent** there — Eng verdicts are conditional on the checklist commit on the CFO branch)  
**Date:** 7 Nov 2026  

### Approver rules

- **Aloke** = product owner + final approver on **all** D01–D15.
- Per-approver status only: `Pending` | `Approve` | `Approve with changes` | `Reject` | `N/A`.
- **Fully approved** only when Aloke **and** every required advisor have signed (`Approve`, or Aloke-accepted `Approve with changes`). **Reject** blocks full approval.
- Aloke’s existing Approve marks are **preserved**. ⚑ = Aloke Approved but not fully approved (advisor Pending / AwC / Reject).
- **D11 / D12 / D13 / D15** remain **not Aloke-approved**.

### Legal column caveat (all rows)

Legal verdicts = **internal conditional compliance review / advisory only** — **NOT** licensed legal sign-off, solicitor opinion, or go-live authorization. Qualified local counsel + tax/payment specialists must clear **P0 launch gates** below.

### Status legend

| Tag | Meaning |
| --- | --- |
| ⚑ | Aloke Approved, **not fully approved** (advisor AwC / Reject / Pending) |
| ◇ | Aloke not yet Approved |
| ✖ | Advisor **Reject** — blocks full approval until remediated + re-review |

---

| ID | Decision (short) | Required | Aloke | Legal (CA&Legal) | Finance (CFO) | Eng/Security (CTO) | Fully approved? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D01 | Meter, graduated volume, tax, annual prepay | Aloke, Finance, Legal, Eng | Approve ⚑ | Approve with changes | Approve with changes | Approve with changes | **No** | Tax by location/biz or MoR; no stack/min net; graduated volume; place-of-supply (OIDAR/RC); no blanket 18% GST |
| D02 | Entitlements + AI meter | Aloke, Finance, Eng, Legal | Approve ⚑ | Approve with changes | Approve with changes | Approve with changes | **No** | Entitlements ≠ expand authority; RO still PII; AI cost ≤10–15% tier revenue; server-side gates |
| D03 | R1 vs R1A | Aloke, Finance, Eng | Approve ⚑ | Approve | Approve | Approve with changes | **No** | R1 must include billing; disable R1A until standing-policy auth tested; marketing matches product |
| D04 | Profiles at launch | Aloke, Eng, Legal | Approve ⚑ | Approve with changes | N/A | Approve with changes | **No** | Explicit schemas + publish gates; gate templates/deposits/notices by state+use |
| D05 | Postgres / SQLite pilot | Aloke, Eng, Finance, Legal | Approve ⚑ | Approve with changes | Approve with changes | Approve with changes | **No** | Backups/Postgres budget; WAL-aware offsite restore; live pilot isolation/ACLs — risk label ≠ waiver |
| D06 | Model provider + caps | Aloke, Eng, Finance, Legal | Approve ⚑ | Approve with changes | Approve with changes | Approve with changes | **No** | Hard caps; block live-PII AI until provider review; training off by default |
| D07 | First MCP host | Aloke, Eng, Finance, Legal | Approve ⚑✖ | Approve with changes | Approve | **Reject** | **No** | Eng REJECT: need prod OAuth, tenant-bound tokens, revocation, cert matrix. Say “compatibility-tested” not certified |
| D08 | Never-auto | Aloke, Eng, Finance | Approve ⚑ | Approve | Approve | Approve with changes | **No** | Never-auto on every automated mutation; A3 default-off + tests |
| D09 | Dual-control | Aloke, Eng, Finance, Legal | Approve ⚑✖ | Approve with changes | Approve with changes | **Reject** | **No** | Eng REJECT: no dual control / tamper-resistant audit yet. Legal: define large refund; bind amount/payee; expire |
| D10 | Vendors / go-live | Aloke, Finance, Legal, Eng | Pending | Approve with changes | Approve with changes | Approve with changes | **No** | Live tax + signed MoR + KYC DPA + test invoice; demo never live creds/PII/funds |
| D11 | MoR / fees / rent | Aloke, Finance, Legal, Eng | Pending ◇ | Approve with changes | Approve with changes | Approve with changes | **No** | Dodo=MoR; PayPal≠MoR; rent never Deskulpt; commissions+rent collection disabled until closed |
| D12 | Affiliate | Aloke, Legal, Finance, Eng | Pending ◇ | Approve with changes | Approve with changes | Approve with changes | **No** | Inactive; disable real reward accrual; activation needs terms/disclosure/clawbacks/GST-TDS-FEMA |
| D13 | Country enablement | Aloke, Legal, Finance, Eng | Pending ◇✖ | **Reject** | Approve with changes | Approve with changes | **No** | Legal REJECT: wording → “India demo only; production pending documented country/state/feature gates; Canada sales parked.” |
| D14 | UI framework | Aloke, Eng, Legal | Approve ⚑ | Approve with changes | N/A | Approve with changes | **No** | Reconcile shadcn desks; SW never caches tenant/financial; a11y; clear caches on logout |
| D15 | Media / Matterport | Aloke, Legal, Eng, Finance | Pending ◇ | Approve with changes | Approve with changes | Approve with changes | **No** | Paid add-on or BYO; storage cap; stills need pub rights + occupant consent; EXIF strip; embed CSP |

### P0 launch-gate list (owner approval does **not** replace these)

1. **India tax specialist** sign-off on OIDAR / reverse charge / PE analysis for Deskulpt Inc (Canadian, no Indian entity).
2. **Documented fund flows** — subscriptions vs rent/deposits; MoR vs processor; no pooled rent through Deskulpt books.
3. **State lease** execution / stamp / registration gates by jurisdiction + use type.
4. **Privacy + security review** for live data / AI / MCP (PII min, redaction, provider contracts, OAuth, tenant isolation, dual-control).

Until these close: **scope = synthetic-data demo**. Demo ≠ real.

### Security sibling ownership (out of this CFO PR scope)

Unauthenticated `app/files/[...path]/route.ts`, MCP demo auth `lib/mcp/session.ts`, single-actor approval `lib/mcp/approvals.ts`, model data `lib/agentic/model.ts` — security sibling fixes. CFO PR does not claim those closed.

### Flagged — Aloke Approved + advisor AwC / Reject → not fully approved

See [`advisor-vs-aloke-approval-summary.md`](./advisor-vs-aloke-approval-summary.md).

### Fully approved today

**None.** (D03/D04/D14 previously looked close; Eng and/or Legal AwC/Reject now block.)

### Hard rules for agents

- No live money until D10 + P0 gates pass.
- Never-auto fail-closed (D08).
- Do **not** treat D11 / D12 / D13 / D15 as Aloke-approved.
- **Do not merge PR #44** — stack/supersede from `039b379`.
- Synthetic-data demo until gates close.

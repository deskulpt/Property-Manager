# CFO review applied — 7 Nov 2026

**Branch:** `cursor/cfo-review-pricing-tax-0ae5` (stacks/supersedes #44 from tip `039b379`)  
**Do not merge #44.**  
**Checklist / decisions / advisor summary:**  
- [`prd-unified-approval-checklist.md`](./prd-unified-approval-checklist.md)  
- [`prd-decisions-d01-d15.md`](./prd-decisions-d01-d15.md)  
- [`advisor-vs-aloke-approval-summary.md`](./advisor-vs-aloke-approval-summary.md)  

**Eng review baseline:** GH `main` @ `5ca1b25` (checklist absent). Eng verdicts conditional — **link checklist commit SHA** on CFO branch after push (header of checklist).

## What landed in code (DEMO/STUB labelled)

| Slice | Path |
| --- | --- |
| Tax adapter (location + B2B/B2C; MoR step-aside; OIDAR dependency) | `lib/billing/tax.ts` |
| Graduated volume + no-stack + deferred revenue stub | `lib/billing/pricing.ts` |
| AI meter / caps / 80% alert / model downgrade | `lib/billing/ai-meter.ts` |
| Dual-control threshold stubs (`productionReady: false`) | `lib/billing/dual-control.ts` |
| Go-live gate fail-closed | `lib/billing/go-live-gate.ts` + wired in `lib/billing/store.ts` |
| MoR vs processor roles | `lib/billing/commerce-roles.ts` |
| Affiliate documented inactive | `lib/billing/affiliate-terms.ts` |
| Matterport not in base; media caps | `lib/plans.ts` |
| Tests | `test/billing-cfo-slice.test.ts` (+ pricing/paypal updates) |

## Approver snapshot

- Finance + Eng/Security + Legal **all recorded**.  
- **Fully approved: 0.**  
- Rejects: D07 Eng · D09 Eng · D13 Legal.  
- D11/D12/D13/D15 **not Aloke-approved**.  
- Scope: **synthetic-data demo** until P0 gates close.

## P0 launch gates (owner approval ≠ replace)

1. IN tax specialist (OIDAR / reverse charge / PE)  
2. Documented fund flows (subscriptions vs rent; MoR vs processor)  
3. State lease execution / stamp / registration  
4. Privacy + security review for live data / AI / MCP  

Security sibling owns: `app/files/[...path]/route.ts`, `lib/mcp/session.ts`, `lib/mcp/approvals.ts`, `lib/agentic/model.ts`.

---

### LEGAL

1. Who is qualified India counsel / tax specialist for OIDAR + reverse charge + PE given Canadian Deskulpt Inc (no Indian entity)?  
2. Confirm required public wording: “India demo only; production pending documented country/state/feature gates; Canada sales parked.” (Legal D13 Reject)  
3. Dodo MoR eligibility letter + PayPal processor terms (no IN domestic; PayPal ≠ MoR) — who signs?  
4. Affiliate activation pack: paid-referral disclosure, clawbacks, GST/HST/TDS/FEMA — counsel owner?  
5. Matterport/stills: occupant consent + publication rights template by profile — Legal draft owner?  
6. Dual-control “large refund” definition (currency, threshold, notice binding) for counsel-acceptable audit?

### FINANCE

1. Aloke: accept or revise Finance AwC on D01/D02/D05/D06/D09–D13/D15 — and pick MoR before further tax go-live work?  
2. Graduated volume catalogue OK as coded (1–5 / 6–20 / 21–50), or change band edges?  
3. Min-net floor bps (5000) — keep as affiliate-only floor, or change sale catalogue to sit exactly on floor?  
4. Annual deferred revenue: books system of record (QuickBooks/Xero/other) and recognition journal owner?  
5. AI cost ≤10–15% of tier revenue — measured on list price, collected net, or package fee only?  
6. Dual-control dollar threshold default ($500 USD cents stub) — final CAD/INR amount?  
7. Canada first vs India-via-MoR sequencing if MoR contract slips?

### TECH

1. Eng Reject D07: prod OAuth + tenant-bound tokens + revocation + host cert matrix — milestone owner / PR target?  
2. Eng Reject D09: tamper-resistant dual-control (distinct approvers, request binding, expiry/replay/race) — coordinate with security sibling on `lib/mcp/approvals.ts`?  
3. Webhook idempotency + reconciled metering (Eng D01 AwC) — extend which provider adapters first (dodo vs paypal)?  
4. Wire taxCustomer (GSTIN / business number / province) into checkout UI + schema columns — preferred table?  
5. AI meter persistence (account + env spend) — store in SQLite now or wait for Postgres budget (D05)?  
6. Confirm go-live env flags (`TAX_LIVE_RATES`, `MOR_CONTRACT_SIGNED`, `KYC_DPA_SIGNED`, `TEST_INVOICE_TAX_OK`) ops runbook owner?  
7. Checklist commit SHA on CFO branch for Eng conditional review linkage — verify after push matches header?

---

*End CFO apply note.*

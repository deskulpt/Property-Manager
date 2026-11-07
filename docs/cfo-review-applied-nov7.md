# CFO review applied — 7 Nov 2026 (Stripe Tax / BM update)

**PR:** [#45](https://cursor.com/codebase/deskulpt/Property-Manager/pull/45) · `cursor/cfo-review-pricing-tax-0ae5`  
**Do not merge #44.** Eng checklist SHA: `16a549b`  
**Checklist / decisions / summary:**  
- [`prd-unified-approval-checklist.md`](./prd-unified-approval-checklist.md)  
- [`prd-decisions-d01-d15.md`](./prd-decisions-d01-d15.md)  
- [`advisor-vs-aloke-approval-summary.md`](./advisor-vs-aloke-approval-summary.md)  

## Aloke BM (owner direction — **not** Aloke Approve on D11/D12/D13/D15)

Deskulpt Canadian · subscriptions via **Stripe** · rent on landlord **UPI/Razorpay** · Deskulpt never touches rent · **% surcharge** separate invoice after settlement · launch **Telangana + Ontario** · EasyRental = templates/storage/eSign + landlord legal review · open to Indian director.

## CFO updates this pass

| Item | Verdict |
| --- | --- |
| Razorpay Route / linked accounts / splits | **BLOCKER — do not build** |
| Holding deposits | **REJECT** |
| Subscription tax | **Stripe + Stripe Tax**; Stripe=processor; Deskulpt remits; ON HST; IN RC+GSTIN |
| Surcharge | Separate Stripe invoice after settlement; not Route |
| **D09 Finance** | **Approve** (override AwC) — CAD500 / 1 mo sub; two-person payouts & deposit releases; no self-approve; CAD2k/day; audit |
| **D11 Finance** | **Approve with changes**, conditional on no Route + deposits not held |
| **D13 Finance** | **Approve with changes** — Ontario first; Telangana gated on entity+GST |
| Legal | Update pending — Legal column unchanged |

## Code direction on #45

- Default provider → Stripe  
- Tax adapter → Stripe Tax path (kill MoR step-aside as primary)  
- `razorpayRouteAllowed(): false` · `deskulptMayHoldDeposits(): false`  
- `lib/billing/surcharge.ts` — separate Stripe invoice stub  
- Dual-control Finance CAD thresholds  
- Go-live gate adds Route + deposit confirmations  

Fully approved: **0**. D11/D12/D13/D15 not Aloke-approved.

---

## Legal update (same day)

- **D13 Legal → Approve with changes** (was Reject). Wording: “Telangana and Ontario selected; synthetic demos allowed; production gated by feature.”
- Feature flags OFF until Razorpay acceptance + specialist review (Route, pooling, deposits, mandatory tenant surcharges, e-store, concierge, affiliate).
- Ontario RTA / Telangana stamp-registration / CA tax matrix / real-PII AI-media blocks recorded.
- **OPEN Legal↔CFO:** Stripe UPI (verify) vs landlord-owned Razorpay/UPI — code follows CFO/BM until closed.
- D11/D12/D13/D15 still **not** Aloke-approved.

### LEGAL

1. Re-review D13 Reject wording vs Aloke BM (Telangana + Ontario launch) — Legal update pending.  
2. Indian director / PE / GSTIN path for Telangana gate — counsel?  
3. Landlord legal-review disclaimer for templates/eSign — standard form?  
4. Surcharge disclosure + auto-mandate terms (CAD/INR)?  
5. Deposit “licensed escrow” definition for Telangana + Ontario?  
6. Dual-control Finance policy vs Eng Reject — Legal view on interim demo?

### FINANCE

1. Disclosed surcharge **%** for launch (Telangana vs Ontario)?  
2. Confirm Stripe Tax account / remittance cadence for Deskulpt CA?  
3. Telangana entity+GST question list for gate (GSTIN, director, PE)?  
4. Dual-control CAD2k/day — multi-currency (INR) conversion rule?  
5. Surcharge invoice currency when rent settled in INR on Razorpay?  
6. Accept Finance D11 AwC conditions as closed once Route/deposit code asserts false?

### TECH

1. Stripe Tax SDK / API wiring vs current stub rates — milestone?  
2. Landlord Razorpay/UPI credential UX (Deskulpt stores keys only for landlord-owned account — never Route)?  
3. Surcharge job: detect rent settled webhook from landlord Razorpay → enqueue Stripe invoice?  
4. Dual-control Eng Reject remediation owner (with security sibling)?  
5. Schema: GSTIN / CA BN / province on tenant billing profile?  
6. Default billing country CA — any India checkout callers need explicit `IN`?

---

*End CFO apply note.*

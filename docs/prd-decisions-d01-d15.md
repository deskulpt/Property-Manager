# D01–D15 decisions register (PARTIAL — BM + CFO Stripe path 7 Nov 2026)

**Status:** PARTIAL · Aloke BM answers recorded as **owner direction** · **D11/D12/D13/D15 not Aloke-approved** · Finance D09 → **Approve** · Finance D11/D13 → **Approve with changes** · Legal update pending (Legal column unchanged this pass) · Eng Rejects D07/D09 stand  
**PR:** [#45](https://cursor.com/codebase/deskulpt/Property-Manager/pull/45) · branch `cursor/cfo-review-pricing-tax-0ae5` · Eng checklist SHA `16a549b`  
**Do not merge #44.**

**Legal caveat:** advisory only — not licensed sign-off. Legal update pending.

---

## Aloke business-model answers (owner direction — not Aloke Approve on gated IDs)

| Topic | Answer |
| --- | --- |
| Entity | Deskulpt Inc **Canadian**; open to **Indian director** if needed |
| Subscriptions | **Stripe** |
| Rent | Landlord-owned **UPI / Razorpay** — Deskulpt **never touches rent** |
| Platform take | **% surcharge** after rent settles — **separate Stripe invoice** |
| Launch markets | **Telangana + Ontario** |
| Product legal role | Templates / storage / eSign only — **landlord legal review** |

---

## D01 — Charging meter + tax ⚑

| Approver | Status |
| --- | --- |
| Aloke | Approve |
| Legal | Approve with changes *(unchanged; Legal update pending)* |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

**Finance (updated):** Subscriptions on **Stripe + Stripe Tax**; Stripe = **processor**; Deskulpt files/remits. Tax: Stripe Tax **HST (Ontario)**; India **reverse charge with GSTIN**. Graduated volume; no stack; annual deferred revenue.

---

## D02–D08

Unchanged advisor statuses from prior Finance/Eng/Legal pass. Aloke Approve preserved on D02–D08 where previously set. **None fully approved.** D07 Eng **Reject** stands.

---

## D09 — Dual-control ⚑✖ Eng Reject

| Approver | Status |
| --- | --- |
| Aloke | Approve |
| Legal | Approve with changes *(unchanged)* |
| Finance | **Approve** *(override prior AwC)* |
| Eng/Security | **Reject** |

**Finance APPROVE policy:**

- Refunds **> CAD 500** OR **> 1 month of subscription** → dual control  
- Every **payout** and **deposit release** → two people  
- **No self-approval**  
- **CAD 2,000 / day / approver** cap  
- Books-exportable **audit log**  

Eng Reject (tamper-resistant / race-safe) still blocks full approval. Code stub: `lib/billing/dual-control.ts` (`productionReady: false`).

---

## D10 — Go-live

| Approver | Status |
| --- | --- |
| Aloke | Pending |
| Legal | Approve with changes *(unchanged)* |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

Gate includes: live Stripe Tax · Stripe agreement · KYC DPA · test invoice · **no Route** · **deposits not held**.

---

## D11 — Fees / rent / surcharge — **NOT Aloke-approved** ◇

| Approver | Status |
| --- | --- |
| Aloke | Pending |
| Legal | Approve with changes *(unchanged)* |
| Finance | **Approve with changes** |
| Eng/Security | Approve with changes |

**Finance AwC — conditional on:**

1. **No** Razorpay Route / linked accounts / splits (**BLOCKER**)  
2. **Deposits not held** by Deskulpt (**REJECT** holding)  

Aligned with Aloke BM: Stripe subscriptions; rent on landlord UPI/Razorpay; % surcharge = separate Stripe invoice after settlement (auto card/mandate; disclosed %).

---

## D12 — Affiliate — **NOT Aloke-approved** ◇

Unchanged — documented inactive. Aloke Pending.

---

## D13 — Country enablement — **NOT Aloke-approved** ◇✖ Legal Reject

| Approver | Status |
| --- | --- |
| Aloke | Pending |
| Legal | **Reject** *(unchanged until Legal re-review)* |
| Finance | **Approve with changes** |
| Eng/Security | Approve with changes |

**Finance AwC:** **Ontario first**; **Telangana gated** on entity + GST questions (Indian director option open per Aloke BM).  
**Legal Reject wording** still applies until Legal update: India demo only / Canada sales parked — reconcile with Telangana+Ontario BM in Legal pass.

---

## D14–D15

D14 Aloke Approve + advisor AwC — not fully approved.  
D15 **not Aloke-approved** — Matterport add-on/BYO; media caps.

---

## Code direction (PR #45)

- Default subscription provider → **Stripe**  
- Tax → **Stripe Tax** stub (ON HST; IN RC + GSTIN)  
- Kill Route assumptions (`razorpayRouteAllowed(): false`)  
- Deposits never on Deskulpt books  
- Surcharge module: separate Stripe invoice after settlement  
- Dual-control Finance thresholds (CAD)

---

*End decisions register.*

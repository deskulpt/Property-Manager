# D01–D15 decisions register (PARTIAL — Legal update 7 Nov 2026)

**Status:** PARTIAL · Legal pass recorded · **D11/D12/D13/D15 not Aloke-approved** · D13 Legal → **Approve with changes** (was Reject) · Finance D09 **Approve** · Eng Rejects D07/D09 stand · **OPEN Legal↔CFO** on rent rails  
**PR:** [#45](https://cursor.com/codebase/deskulpt/Property-Manager/pull/45) · `cursor/cfo-review-pricing-tax-0ae5`  
**Do not merge #44.**

**Legal caveat:** conditional advisory only — **NOT** licensed legal sign-off or go-live auth.

---

## OPEN conflict — Legal ↔ CFO (rent payment rails)

| | Position |
| --- | --- |
| **Legal** | Canadian Stripe may support **UPI** — **needs verify** with Stripe |
| **CFO / Aloke BM** | Rent settles on **landlord-owned Razorpay/UPI**; Deskulpt never touches rent; **no Route** |

**OPEN** — record only. Code on #45 follows CFO/BM (Stripe = subscriptions; landlord rails for rent) until conflict closed.

---

## Aloke BM (owner direction — not Aloke Approve on gated IDs)

Deskulpt Canadian · Stripe subscriptions · landlord UPI/Razorpay rent · % surcharge separate invoice after settlement · Telangana + Ontario · templates/storage/eSign + landlord legal review · open to Indian director.

---

## Legal cross-cutting (7 Nov)

1. **Subscription-only SaaS** (Stripe; Deskulpt **direct seller**; no outside MoR) can be assessed **separately** from rent collection.  
2. Feature flags **OFF** until written Razorpay acceptance + specialist review: Route rent splits · platform fund pooling · deposit holds · mandatory tenant surcharges · e-store · concierge · affiliate.  
3. **Ontario:** no generic damage deposits for RTA residential; prescribed standard lease; eSign OK; notice service separate.  
4. **Telangana:** disclaimers ≠ stamp/registration; no “compliant” claims for e-signed leases.  
5. **Tax:** replace blanket 18% GST with **CA-approved matrix**; overseas OIDAR may need IN GST reg; registered → RC; Ontario HST incl. CAD30k small-supplier.  
6. **AI / connectors / media:** blocked for real PII until vendor/DPA/retention review.

---

## D01 — Meter + tax ⚑

| Approver | Status |
| --- | --- |
| Aloke | Approve |
| Legal | Approve with changes |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

**Legal AwC:** CA-approved tax matrix; no blanket 18% GST; OIDAR/RC/small-supplier rules as above.  
**Finance AwC:** Stripe Tax HST + IN RC with GSTIN; graduated volume; no stack.

---

## D02–D08

Prior statuses stand. Legal AwC reinforces real-PII AI/media block (D02/D06). D07 Eng **Reject** stands. None fully approved.

---

## D09 — Dual-control ⚑✖

| Approver | Status |
| --- | --- |
| Aloke | Approve |
| Legal | Approve with changes |
| Finance | **Approve** |
| Eng/Security | **Reject** |

Finance policy unchanged (CAD500 / 1 mo sub; two-person payouts & deposit releases; CAD2k/day; audit). Eng Reject blocks full approval.

---

## D10 — Go-live

Legal AwC: feature flags OFF until Razorpay acceptance + specialist review for money-adjacent features; per-feature evidence not global switch.

---

## D11 — Fees / rent / surcharge — **NOT Aloke-approved** ◇

| Approver | Status |
| --- | --- |
| Aloke | Pending |
| Legal | Approve with changes |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

Finance conditions: no Route; deposits not held. Legal: no platform fund pooling / deposit holds / mandatory tenant surcharges (flags OFF). **OPEN Legal↔CFO** on Stripe UPI vs landlord Razorpay.

---

## D12 — Affiliate — **NOT Aloke-approved** ◇

Legal/Finance/Eng AwC: inactive; flag OFF until specialist review. Aloke Pending.

---

## D13 — Country enablement — **NOT Aloke-approved** ◇

| Approver | Status |
| --- | --- |
| Aloke | Pending |
| Legal | **Approve with changes** *(was Reject)* |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

**Legal required wording:**  
> “Telangana and Ontario selected; synthetic demos allowed; production gated by feature.”

**Finance AwC:** Ontario first; Telangana gated on entity+GST Qs.  
Subscriptions (Stripe direct seller) assessable separately from rent rails.

---

## D14–D15

D14 Aloke Approve + AwC — not fully approved.  
D15 **not Aloke-approved** — Matterport add-on/BYO; real-PII media blocked until DPA/retention.

---

## Fully approved

**0.**

---

*End decisions register.*

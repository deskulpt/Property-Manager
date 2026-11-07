# D01–D15 decisions register (PARTIAL — Aloke Indian-entity Razorpay decision)

**Status:** PARTIAL · **D11/D12/D13/D15 not Aloke-approved** · Aloke owner direction on Indian entity recorded · Legal D13 AwC · Finance D09 Approve · Eng Rejects D07/D09  
**PR:** [#45](https://cursor.com/codebase/deskulpt/Property-Manager/pull/45)  
**Legal caveat:** conditional advisory only — not licensed go-live auth.

---

## Aloke decision — Indian entity + Razorpay (owner direction)

**Do not treat as Aloke Approve of D11 / D12 / D13 / D15.**

| Decision | Detail |
| --- | --- |
| Indian entity | **Will be registered** for Razorpay |
| Razorpay design | Keyed to **Indian-entity merchant account** |
| Canada SaaS | **Stripe** remains Deskulpt Canada subscriptions |
| Route splits | Behind flags — **OFF** until **(1)** entity exists **(2)** Razorpay written acceptance **(3)** Legal sign-off |
| Deposit holds | Behind flags — **OFF** until same three gates |

Code: `ALOKE_INDIAN_ENTITY_DECISION` + `evaluateRouteDepositGates()` in `lib/billing/legal-flags.ts`.

---

## OPEN Legal ↔ CFO (narrowed)

- Legal: CA Stripe UPI may work — verify.  
- Aloke India path: Indian-entity Razorpay; Route/deposits gated.  
- Stripe = CA subscriptions.  
- Do not enable CA Stripe UPI for rent without Legal+Finance close.

---

## Prior Aloke BM (still in force as direction)

% surcharge separate Stripe invoice after rent settles · Telangana + Ontario · templates/storage/eSign + landlord legal review · open to Indian director → **superseded in part** by “will register Indian entity.”

---

## D11 — **NOT Aloke-approved** ◇

| Approver | Status |
| --- | --- |
| Aloke | Pending |
| Legal | Approve with changes |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

Finance AwC conditions evolve to: Route/deposits **OFF until 3 gates** (not forever-ban once gates + Legal sign-off). Surcharge still separate Stripe invoice. Subscriptions Stripe CA.

---

## D13 — **NOT Aloke-approved** ◇

| Approver | Status |
| --- | --- |
| Aloke | Pending |
| Legal | Approve with changes |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

**Legal wording:** “Telangana and Ontario selected; synthetic demos allowed; production gated by feature.”  
Indian entity registration supports Telangana/Razorpay production gating — still not Aloke Approve of D13.

---

## D09 Finance Approve (unchanged)

Refunds >CAD500 or >1 mo sub; two-person payouts & deposit releases; no self-approve; CAD2k/day; audit. Eng Reject stands.

---

## D01–D08, D10, D12, D14, D15

Statuses unchanged from Legal update pass. D12/D15 not Aloke-approved. Fully approved: **0**.

---

*End decisions register.*

# D01–D15 decisions register (PARTIAL — Finance D11 Ontario AwC)

**Status:** PARTIAL · **D11/D12/D13/D15 not Aloke-approved** · Finance **D11 Ontario → Approve with changes** · Legal ON tenant-fee/provider-reg **pending** (feature flag OFF) · Finance D09 Approve · Eng Rejects D07/D09  
**PR:** [#45](https://cursor.com/codebase/deskulpt/Property-Manager/pull/45)  
**Legal caveat:** conditional advisory only — not licensed go-live auth.

---

## Aloke decision — country URL paths `/in` + `/ca` (owner direction)

**Not Aloke Approve of D11–D15.** Config via **CountryPack**.

| Path | Pack |
| --- | --- |
| `/in` | India CountryPack |
| `/ca` | Canada CountryPack |

**Implementation owner:** sibling agent **Country path routing** (separate PR). This billing/#45 branch records the decision only — does not implement route shards.

---

## D11 — Fees / rent / surcharge — **NOT Aloke-approved** ◇

| Approver | Status |
| --- | --- |
| Aloke | Pending |
| Legal | Approve with changes *(ON tenant-fee / provider-reg still pending)* |
| Finance | **Approve with changes** (Ontario model below) |
| Eng/Security | Approve with changes |

### Finance D11 Ontario model (AwC)

| Item | Spec |
| --- | --- |
| Rent | **Stripe Connect DIRECT** on landlord connected account — **not** destination charges, **not** separate charges |
| Method | **PAD** (pre-authorized debit) |
| Deskulpt take | **Application fee only**, fee **includes 13% HST** |
| Reporting | Monthly landlord statement showing Deskulpt **GST/HST number** |
| Tenants | **No fees to tenants** |
| PAD dispute | **Reverse** application fee if PAD disputed |
| Non-Connect markets | **Separate invoice** path remains |
| Feature flag | `ontarioConnectDirectPad` = **OFF** until Legal ON tenant-fee / provider-reg closes |

### Pricing config-only (amounts **not final**)

- CA$3–5 / unit / month  
- 0.5–1% payments fee, **capped** CA$15 / unit / month  
- CA$10 / month **minimum** per landlord on payments plans  

Code stub: `lib/billing/ontario-connect.ts`.

### Still in force (IN / global)

- Indian entity will register for Razorpay; Route/deposit holds OFF until 3 gates  
- Stripe = Deskulpt Canada **subscriptions**  
- No Aloke Approve of D11

---

## D12 / D13 / D15 — **NOT Aloke-approved**

Unchanged. D13 Legal wording: “Telangana and Ontario selected; synthetic demos allowed; production gated by feature.”

---

## D09 Finance Approve (unchanged)

Refunds >CAD500 or >1 mo sub; two-person payouts & deposit releases; no self-approve; CAD2k/day; audit. Eng Reject stands.

---

## Fully approved

**0.**

---

*End decisions register.*

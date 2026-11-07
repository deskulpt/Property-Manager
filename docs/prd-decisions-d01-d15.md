# D01–D15 decisions register (PARTIAL — Legal Ontario + IN entity update)

**Status:** PARTIAL · **D11/D12/D13/D15 not Aloke-approved** · Finance D11 Ontario AwC · Legal Ontario commission → **AwC design/test only, not live** · Finance D09 Approve · Eng Rejects D07/D09  
**PR:** [#45](https://cursor.com/codebase/deskulpt/Property-Manager/pull/45)  
**Legal caveat:** conditional advisory only — **NOT** licensed legal sign-off or go-live auth.

---

## Aloke decision — country URL paths `/in` + `/ca` (owner direction)

**Not Aloke Approve of D11–D15.** Config via **CountryPack**.

| Path | Pack |
| --- | --- |
| `/in` | India CountryPack |
| `/ca` | Canada CountryPack |

**Implementation owner:** sibling **Country path routing** (separate PR). Billing/#45 cross-link only.

---

## Aloke + Legal — Indian entity / Razorpay (owner direction — not Approve)

| Item | Decision |
| --- | --- |
| Form | Plan **IN Pvt Ltd subsidiary** |
| Razorpay | Written **in-principle acceptance first** |
| Route / linked accounts | **OFF** until **written approval** — incorporating ≠ Route eligibility |
| Deposits | **OFF** until written approval |
| Canada SaaS | Stripe (Deskulpt Canada) |

---

## D11 — **NOT Aloke-approved** ◇

| Approver | Status |
| --- | --- |
| Aloke | Pending |
| Legal | **Approve with changes — design/test only, not live** |
| Finance | Approve with changes (Ontario Connect DIRECT + PAD) |
| Eng/Security | Approve with changes |

### Finance Ontario model (unchanged intent)

Stripe Connect **DIRECT** · PAD · application fee only · monthly statement w/ GST/HST # · no tenant fees · reverse fee on PAD dispute · separate invoice without Connect · pricing config-only.

### Legal Ontario commission (AwC — design/test only)

| Rule | Detail |
| --- | --- |
| Landlord-paid 1–2% | Needs **express landlord service/deduction agreement**; **credit tenant full rent paid** |
| Tenant card convenience fee | **Permanently OFF** (RTA s134 — no safe harbour) |
| PAD | **Optional, never mandatory**; Payments Canada **Rule H1** mandates + cancel rights |
| Stripe customer | ≠ BoC payment-provider registration / FINTRAC MSB exemption — **Deskulpt-specific assessment before live** |
| Connect app fee HST | Stripe **does not** calc HST — **compute/remit ourselves** |
| Quebec | Card surcharges **prohibited** |
| Before live | Funds-flow diagram + contracts; Stripe use-case acceptance; **ON counsel + CPA** |

Feature flag `ontarioConnectDirectPad` = **OFF** (not live).

Code: `lib/billing/ontario-connect.ts` · `ONTARIO_COMMISSION_LEGAL` in `legal-flags.ts`.

---

## D12 / D13 / D15 — **NOT Aloke-approved**

D13 Legal wording: “Telangana and Ontario selected; synthetic demos allowed; production gated by feature.”

---

## D09 Finance Approve (unchanged)

Eng Reject stands.

---

## Fully approved

**0.**

---

*End decisions register.*

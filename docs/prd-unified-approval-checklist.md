# Unified PRD v1.1 — Multi-approver checklist (D01–D15)

**PR:** [#45](https://cursor.com/codebase/deskulpt/Property-Manager/pull/45) · **Decisions:** [`prd-decisions-d01-d15.md`](./prd-decisions-d01-d15.md) · **Summary:** [`advisor-vs-aloke-approval-summary.md`](./advisor-vs-aloke-approval-summary.md)  
**Date:** 7 Nov 2026 (Legal Ontario commission + IN entity)

### Hard rules

- **D11 / D12 / D13 / D15 not Aloke-approved.**
- Legal = conditional advisory only — not licensed go-live auth.
- Fully approved: **0**.

### Legal — Ontario commission (AwC = design/test only, **not live**)

- Landlord-paid 1–2%: express service/deduction agreement; credit tenant full rent  
- Tenant card convenience fee: **permanently OFF** (RTA s134)  
- PAD optional never mandatory; Rule H1  
- Stripe customer ≠ BoC/FINTRAC auto-exemption — Deskulpt assessment before live  
- Compute/remit HST ourselves (Connect app fee doesn’t)  
- Quebec: no card surcharges  
- Before live: funds-flow + contracts; Stripe acceptance; ON counsel + CPA  
- Flag `ontarioConnectDirectPad` **OFF**

### Legal — Indian entity

- Plan **IN Pvt Ltd subsidiary**; Razorpay **written in-principle first**  
- Incorporating ≠ Route eligibility — Route/linked accounts + deposits **OFF** until written approval  

### Aloke `/in` + `/ca`

CountryPack paths — sibling **Country path routing** owns PR.

---

| ID | Aloke | Legal | Finance | Eng | Fully? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| D09 | Approve ⚑✖ | AwC | **Approve** | **Reject** | **No** | |
| D11 | Pending ◇ | **AwC design/test only** | AwC | AwC | **No** | **Not Aloke-approved.** ON Connect DIRECT+PAD; live blocked |
| D12 | Pending ◇ | AwC | AwC | AwC | **No** | **Not Aloke-approved** |
| D13 | Pending ◇ | AwC | AwC | AwC | **No** | **Not Aloke-approved** |
| D15 | Pending ◇ | AwC | AwC | AwC | **No** | **Not Aloke-approved** |
| D01–D08, D10, D14 | prior | prior | prior | D07 Reject | **No** | |

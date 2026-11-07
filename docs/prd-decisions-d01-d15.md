# D01–D15 decisions register (PARTIAL — Finance + Eng/Security + Legal recorded 7 Nov 2026)

**Status:** PARTIAL · All three advisor columns recorded · **No decision fully approved** · D11/D12/D13/D15 **not Aloke-approved** · D07 Eng **Reject** · D09 Eng **Reject** · D13 Legal **Reject**  
**Authority:** Checklist [`prd-unified-approval-checklist.md`](./prd-unified-approval-checklist.md) · Summary [`advisor-vs-aloke-approval-summary.md`](./advisor-vs-aloke-approval-summary.md) · CFO note [`cfo-review-applied-nov7.md`](./cfo-review-applied-nov7.md)  
**Stack base:** `039b379` on `cursor/d01-d02-pricing-entitlements-6564` — **do not merge #44**  
**Build branch:** `cursor/cfo-review-pricing-tax-0ae5`  
**Eng review baseline:** GH `main` @ `5ca1b25` (checklist absent) — Eng verdicts conditional on checklist commit `16a549b9f53f0d3f749f8b3094e5a140ddc26665`.

**Approver statuses:** `Pending` | `Approve` | `Approve with changes` | `Reject` | `N/A`  
**Legal caveat:** advisory / internal conditional compliance only — **NOT** licensed legal sign-off or go-live auth.

---

## D01 — Charging meter + tax ⚑

| Approver | Status |
| --- | --- |
| Aloke | Approve |
| Legal (CA&Legal) | Approve with changes |
| Finance (CFO) | Approve with changes |
| Eng/Security (CTO) | Approve with changes |

**Fully approved?** No.

**Finance AwC:** Tax by customer location / B2B·B2C **or** MoR collects; graduated volume (1–5 0%, 6–20 15%, 21–50 25%); no discount stack or min net; annual prepay = deferred revenue. Deskulpt Inc Canadian; no Indian entity.

**Legal AwC:** Define units/discounts/renewals/cancellations/refunds; place-of-supply tax (OIDAR unregistered IN; reverse charge registered biz); **no blanket 18% GST**.

**Eng AwC:** Customer location/biz tax inputs; proration/effective-date; webhook idempotency; reconciled metering.

---

## D02 — Entitlements + AI meter ⚑

| Approver | Status |
| --- | --- |
| Aloke | Approve |
| Legal | Approve with changes |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

**Fully approved?** No.

**Finance AwC:** Per-tier AI allowance + overage; meter Enterprise MCP/API or contract mins; AI cost ≤10–15% tier revenue.

**Legal AwC:** Entitlements ≠ expand authority/consent; RO still PII; demos synthetic.

**Eng AwC:** Server-side plan+tenant gates across AI/MCP/API/jobs.

---

## D03 — R1 vs R1A ⚑

| Approver | Status |
| --- | --- |
| Aloke | Approve |
| Legal | Approve |
| Finance | Approve |
| Eng/Security | Approve with changes |

**Fully approved?** No.

**Finance:** R1 must include billing. **Legal:** marketing matches product. **Eng AwC:** disable R1A entry until standing-policy auth tested.

---

## D04 — Profiles ⚑

| Approver | Status |
| --- | --- |
| Aloke | Approve |
| Legal | Approve with changes |
| Finance | N/A |
| Eng/Security | Approve with changes |

**Fully approved?** No.

**Legal AwC:** Gate templates/deposits/notices/disputes by state+use; commercial ≠ bypass residential. **Eng AwC:** Explicit schemas + server publish gates for 6 profiles.

---

## D05 — Persistence ⚑

| Approver | Status |
| --- | --- |
| Aloke | Approve |
| Legal | Approve with changes |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

**Fully approved?** No.

**Finance AwC:** Backups + Postgres budget before paid scale. **Legal AwC:** Live pilot needs isolation, ACLs, encryption, tested backup/restore, audit, deletion; risk label ≠ waiver. **Eng AwC:** WAL-aware DB+uploads backups, encrypted offsite, restore drill, RPO/RTO, single writer.

---

## D06 — Model provider ⚑

| Approver | Status |
| --- | --- |
| Aloke | Approve |
| Legal | Approve with changes |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

**Fully approved?** No.

**Finance AwC:** Hard caps account+env; 80% alert; cheaper model at cap. **Legal AwC:** Block live-PII AI until provider/processor review, contracts, notices/consent, min, retention, incident; training off by default. **Eng AwC:** Live models off until PII min/redaction/log + provider retention/region.

---

## D07 — MCP host ⚑✖ Eng Reject

| Approver | Status |
| --- | --- |
| Aloke | Approve |
| Legal | Approve with changes |
| Finance | Approve |
| Eng/Security | **Reject** |

**Fully approved?** No.

**Eng Reject:** Need prod OAuth, tenant-bound tokens, revocation, cert matrix. **Legal AwC:** Say “compatibility-tested” not certified/partnered; scoped OAuth, revocation, tenant isolation, disclose clients/models.

---

## D08 — Never-auto ⚑

| Approver | Status |
| --- | --- |
| Aloke | Approve |
| Legal | Approve |
| Finance | Approve |
| Eng/Security | Approve with changes |

**Fully approved?** No.

**Eng AwC:** Never-auto on every automated mutation; A3 default-off + tests. Hard rule: fail-closed.

---

## D09 — Dual-control ⚑✖ Eng Reject

| Approver | Status |
| --- | --- |
| Aloke | Approve |
| Legal | Approve with changes |
| Finance | Approve with changes |
| Eng/Security | **Reject** |

**Fully approved?** No.

**Finance AwC:** $ threshold; no self-approval; books-exportable audit. **Legal AwC:** Define “large refund”; bind exact amount/payee/scope/notice; expire; audit. **Eng Reject:** No dual control / tamper-resistant audit yet — need distinct approvers, request binding, expiry/replay/race. Security sibling owns `lib/mcp/approvals.ts`.

---

## D10 — Go-live vendors

| Approver | Status |
| --- | --- |
| Aloke | Pending |
| Legal | Approve with changes |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

**Fully approved?** No.

**Finance AwC:** Live tax + signed MoR + KYC DPA + verified test invoice. **Legal AwC:** Demo never live creds/PII/funds/sign/msg; per-feature evidence + owner approval not global switch. **Eng AwC:** Block live financial/identity under demo/missing keys; never demo≠real.

---

## D11 — MoR / fees / rent — **NOT Aloke-approved** ◇

| Approver | Status |
| --- | --- |
| Aloke | Pending |
| Legal | Approve with changes |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

**Fully approved?** No.

**Finance/Eng/Legal AwC (aligned):** Dodo=MoR; PayPal=processor only (≠ MoR; no IN domestic); pick MoR before tax build; rent never Deskulpt books; commissions + rent collection **disabled**; separate subscriptions vs rent/deposits; no pooled rent; Dodo eligibility in writing.

---

## D12 — Affiliate — **NOT Aloke-approved** ◇

| Approver | Status |
| --- | --- |
| Aloke | Pending |
| Legal | Approve with changes |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

**Fully approved?** No.

**Documented only, inactive:** ~12 mo cap; net collected; clawback; contractor/GST-HST/TDS. **Eng:** disable real reward accrual in Refer & Earn. **Legal:** activation needs terms, paid-referral disclosure, clawbacks, GST/TDS/FEMA.

---

## D13 — Country enablement — **NOT Aloke-approved** ◇✖ Legal Reject

| Approver | Status |
| --- | --- |
| Aloke | Pending |
| Legal | **Reject** |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

**Fully approved?** No.

**Legal Reject — required wording:** “India demo only; production pending documented country/state/feature gates; Canada sales parked.”  
**Finance AwC:** India first only with Dodo/other MoR as seller; else Canada first. **Eng AwC:** L0 checklist gate; India live ≠ launch ready.

---

## D14 — UI ⚑

| Approver | Status |
| --- | --- |
| Aloke | Approve |
| Legal | Approve with changes |
| Finance | N/A |
| Eng/Security | Approve with changes |

**Fully approved?** No.

**Eng AwC:** Reconcile shadcn desks; SW never caches tenant/financial. **Legal AwC:** Asset licenses, a11y, no sensitive offline caches/notif previews, clear caches on logout.

---

## D15 — Media — **NOT Aloke-approved** ◇

| Approver | Status |
| --- | --- |
| Aloke | Pending |
| Legal | Approve with changes |
| Finance | Approve with changes |
| Eng/Security | Approve with changes |

**Fully approved?** No.

**Finance:** Paid add-on or BYO Matterport; storage cap. **Legal:** Stills need pub rights + occupant consent; redact security; Matterport retention/takedowns. **Eng:** Profile publish rules; tenant-auth private uploads; EXIF strip; embed CSP.

---

## P0 launch gates (owner approval ≠ replace)

1. IN tax specialist (OIDAR / RC / PE)  
2. Documented fund flows  
3. State lease execution/stamp/registration  
4. Privacy + security review for live data / AI / MCP  

**Scope until closed:** synthetic-data demo.

## Build scope

Tax adapter · graduated pricing · no-stack/min net · AI meter/caps · dual-control stubs · go-live gate · docs. **Out:** merge #44 · live MoR · affiliate on · weaken never-auto · claim D11–D13/D15 Aloke-approved · claim security sibling fixes closed.

---

*End decisions register.*

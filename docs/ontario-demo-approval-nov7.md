---
title: Ontario residential demo/staging approval
date: 2026-11-07
approver: Aloke Anand
mode: demo/staging only — no live launch
payments: OFF
data: synthetic only — no real PII to AI tools
counsel: required before go-live
---

# Ontario residential demo/staging — Aloke approved

Build EasyRental for **Ontario residential rentals** in **demo/staging only**. No live launch. Payments OFF. Synthetic data only. No real PII to AI tools. Counsel sign-off required before go-live.

## Product scope rules (enforce in product, not console-only)

1. **RTA residential only** — tenancies covered by the Residential Tenancies Act. Commercial leases and sales excluded (TRESA s5(1)(j) exemption).
2. **Direct landlord listings only** — no MLS / PropTx / REALTOR.ca scraping or import.
3. **Money / deposits (Ontario)**
   - PAD optional for tenants.
   - No damage deposits allowed.
   - Last month’s rent deposit: max one month’s rent, with interest tracking.
   - Key deposits: refundable, at cost only.
   - Tenant card fees: **hard OFF**.
4. **Forms** — Ontario Standard Lease. Official LTB N-forms only; human review before sending; **no automated eviction**.
5. **Privacy / marketing**
   - PIPEDA: privacy lead field, retention/deletion rules, breach register retained 24 months.
   - CASL consent for marketing.

## PR #50 answers (Legal + CFO refined)

1. **Card fee** — hard OFF. Label: `Disabled by product policy; Ontario residential legal risk`. Changing it needs counsel review **plus a code release**, not a toggle.
2. **Data residency** — declare for demo only. Show **target location** separately from **actual location: unverified**. No compliant/verified badges.
3. **Money flags** — second-admin approval required:
   - No self-approval.
   - Approvals expire after 24h.
   - Audit logs both admins.
   - Any single admin can kill-switch payments off instantly.
   - Both admins alerted on any change.
4. **Audit export CSV** — UTF-8; UTC timestamps; plain decimal amounts + currency column; tax in its own column. Row fields: event ID, actor, approver, action, account/landlord, Stripe/Razorpay ref, amount, tax, status. Append-only; export includes hash + row count; date-range filters.
5. **India** — stays parked and forced OFF.

## Go-live blockers (console: unchecked; do not mark done)

Show as unchecked checklist items in the compliance console:

- [ ] Ontario lawyer written review
- [ ] Stripe money-flow doc plus RPAA/FINTRAC determination
- [ ] Listing rights
- [ ] RTA and privacy controls demonstrated

## Out of scope until counsel

Live payments, production launch, real PII to AI/MCP, India pay-plane, MLS imports, commercial/sales flows, automated eviction.

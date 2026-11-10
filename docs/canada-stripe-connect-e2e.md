# Canada Stripe Connect E2E (demo / design-test)

**PR stack:** on [#45](https://cursor.com/codebase/deskulpt/Property-Manager/pull/45) tip (`ca-connect-checkout` + India park).  
**Live money:** OFF until Legal Canada clearance (`ontarioConnectDirectPad` OFF).  
**India:** PARKED — no in-pay / Razorpay / OCI India work on this path.

## Path (one market complete)

| Step | Surface | Notes |
| --- | --- | --- |
| 1 Onboard | `/landlord/billing/connect` → `/connect/onboard` | Demo Express Account Link; local `acct_demo_ca_*` |
| 2 PAD (optional) | `/landlord/billing/connect/pad` | ACSS debit mandate; never mandatory |
| 3 Hosted Checkout | `/landlord/billing/connect-checkout` | DIRECT + application fee; demo confirm only |
| 4 Statement | `/landlord/billing/connect/statement` | App-fee lines + GST/HST # from `CANADA_PACK` |

Orchestration: `lib/billing/ca-connect-e2e.ts` · store: `lib/billing/ca-connect-store.ts` · builders: `lib/billing/ca-connect-checkout.ts` (#45).

## Coordination

- **#45** — checkout builders, India park, tax identity (base of this PR)
- **#47** — CountryPack `/in` `/ca` + `taxRegistrationId` (flag catalog)
- **#49** — D07/D09 dual-control (money-class audit; live still OFF)
- **#50** — Admin compliance toggles — **open Qs held** (see Admin doc); India toggles stay OFF

## Tests

`test/ca-connect-e2e.test.ts` — full pipeline + PAD-optional + gate refusals.

## LEGAL / FINANCE / TECH (non-toggleable only)

Toggleable flag questions stay on [#50](https://cursor.com/codebase/deskulpt/Property-Manager/pull/50) (held). Below cannot be flipped by Admin console.

### LEGAL

1. RTA s134 — tenant card convenience fee permanently OFF (no future toggle path).
2. PAD optional / never mandatory — cannot require PAD via feature flag.
3. Live Connect before Legal before-live list (funds-flow, Stripe acceptance, ON counsel + CPA, BoC/FINTRAC assessment) — cannot bypass with a demo toggle.

### FINANCE

1. Application-fee HST computed/remitted by Deskulpt (Connect does not calc HST) — policy, not a toggle.
2. Reverse application fee on PAD dispute — required when live; demo records the plan only.
3. No live CA charges until Legal clearance — E2E hard-sets `liveEnabled: false` / `liveCharge: false` even if a flag is mishandled.

### TECH

1. DIRECT charges require `Stripe-Account` connected-account header — not destination/separate charges.
2. Demo path must not call live Stripe SDK / settle real money without go-live gate + Legal.
3. India money plane parked assert (`assertIndiaMoneyParked`) — IN Route/Razorpay/`in-pay` must stay OFF while Canada E2E is the active market build.

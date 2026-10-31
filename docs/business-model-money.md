# Easy Rental — Business model & money

**Product:** Easy Rental (easyrental.space) · **Operator:** DeSkulpt Inc.  
**Audience:** L0/L1 product + eng · Admin sibling · billing slices  
**Tip source of truth:** tip `87d4c57` (`lib/billing/pricing.ts`, `lib/plans.ts`, `lib/markets/*`, prefs) — not older dual-market brochure copy alone.  
**Companion:** [country-schema-switch.md](./country-schema-switch.md)

---

## 1. One-line model

Easy Rental is a **landlord-paid multi-tenant leasing desk + marketplace**. Seekers browse, visit, and apply **free** (“No Broker!”). Platform revenue = **landlord subscriptions** (per-unit SaaS meter) **+ paid services** (shop, partners, refer/affiliate when live) — never seeker contact unlocks or brokerage skim.

---

## 2. Jobs to be done (JTBD)

| Who | Job | Outcome |
| --- | --- | --- |
| **Commercial PM / leasing desk** | Publish C&I inventory, run applications, tours, leases, tickets from one desk | Lease-up without stitching classifieds + WhatsApp + Excel |
| **Independent landlord** | List homes / shops / sheds, take applications, collect rent ops | Desk that scales from 1 unit → portfolio without brokerage |
| **Storage / yard seller** | List outdoor storage, small-bay, yard units with clear size + access | Same unit/property rent path as indoor stock |
| **Multistory building owner** | Map floors → units (2D/3D/Matterport), QR posters, visits | Seamless **unit ↔ property** rent; applicants see the right bay |
| **Lease applicant (L4)** | Find space, book visit, apply, e-sign when invited | Zero platform fee; talk to landlord direct |
| **Service provider (L5)** | Get vetted, geo-matched, landlord-approved jobs | Marketplace adjacency, not rent take-rate |
| **DeSkulpt L0/L1** | Monetize desks, open markets, approve partners | Subscription MoR + services; India-first, country packs later |

**Core product promise:** seamless **unit/property rent** across residential, retail/office, industrial/warehouse, storage — one schema, segment-aware pricing and listing facets.

---

## 3. Segments (who pays / who doesn’t)

### Paying (B2B SaaS tenants)

In product language, SaaS **tenant** = landlord org or PM company (prefs: tenancy wording). Roles that unlock desk after subscribe:

| Role | Ladder | Pays? |
| --- | --- | --- |
| Landlord Account | L2 | **Yes** — platform subscription (per-unit meter) |
| Property Manager Account | L3 | Via landlord org seat / package (not seeker) |
| Platform staff | L0 SuperAdmin · L1 Admin | No — operator |

**Billable listing segments** (tip meter in `lib/billing/pricing.ts`):

| `BillableSegment` | Listing sources | Standard ₹ / unit / mo excl. GST | Launch sale ₹ / unit / mo |
| --- | --- | --- | --- |
| `homes` | `residential` | ₹299 | ₹149 |
| `retail_office` | `commercial` | ₹699 | ₹349 |
| `industrial` | warehouse / industrial / storage-class | ₹1,999 | ₹999 |

Sale window (code): **1 Dec 2026 → 31 Mar 2027 IST**, capped at **500** paying accounts. Volume discount (does **not** stack with sale — better path wins): **6–20** units → 15% off standard; **21–50** → 25%. **Annual = 10 × monthly**. Free plan: **1 unit** org-wide until paid (`FREE_PLAN_MAX_UNITS`).

### Non-paying (demand side)

| Role | Ladder | Pays platform? |
| --- | --- | --- |
| Lease Applicant / occupant | L4 | **No** — browse, visit, apply free |
| Public seeker (logged out) | — | **No** |

### Adjacent revenue (services — not seeker paywalls)

| Surface | Who pays | Status on tip |
| --- | --- | --- |
| Occupant **shop** + landlord Razorpay keys | Occupant → landlord; platform may take future cut | Demo / keys in landlord settings |
| Partner & Service Network (§19C) | Providers / affiliates intake; landlord approve | MVP desks + CMS queue |
| Refer & Earn (§19A) | Referral rewards ledger | Demo INR ledger |
| Partner Affiliate (§19B) | % of landlord subscription | **Scheduled** after live billing |
| Enterprise / custom domain | Landlord Pro+ | Feature gates in `lib/plans.ts` |

---

## 4. Monetization (canonical tip vs older briefs)

### 4.1 Canonical tip — per-unit platform billing

| Rule | Tip fact |
| --- | --- |
| Meter | **Units** in portfolio, mixed by segment |
| Currency of record | **INR paise** for quote math + GST **18%** (`GST_BPS = 1800`) |
| Checkout UI | `/landlord/billing` · `components/billing/billing-desk.tsx` |
| Providers | IN → `BILLING_PROVIDER` (**dodo** default / stripe / demo); non-IN → `BILLING_INTL_PROVIDER` (**paypal** default) — `lib/billing/routing.ts` |
| Intl settlement | PayPal converts GST-inclusive INR → **CAD/USD** via env FX (`lib/billing/fx.ts`) — NRI / CA payer path, **not** a full CA ledger |
| Price lock | 12 months from join (`lockRatesFromQuote`) |
| Cancel | One-click → Free (1 unit) |

**Do not invent seeker SKUs.** Platform MoR is landlord subscription only.

### 4.2 Public ladder still in tip — per-property annual (marketing / package gates)

`lib/plans.ts` + [brief-pricing-plans-mvp.md](./brief-pricing-plans-mvp.md) still expose **Basic / Growth / Pro** as **proposed ₹499 / ₹1,499 / ₹2,999 per active listed property / year** (feature matrix, Ask Easy, custom domain, Razorpay shop gates). Landlord settings still show package usage.

**Reconciliation for eng:**

| Layer | What it controls today |
| --- | --- |
| `quotePlatformBilling` | Money charged at billing desk (per-unit) |
| `PLAN_LIMITS` / `tenants.package` | Soft caps + feature flags (domain, Ask Easy, live Razorpay) |
| Public `/pricing` | Marketing cards from `PUBLIC_PLANS` (still **proposed** amounts) |

Product decision still open for commercial sign-off: keep **both** meters (unit SaaS + property seats) or collapse public copy to match per-unit tip. Until then, docs and UI must not silently charge seekers.

### 4.3 India vs Canada vs future

| | **India (live pack)** | **Canada (seeded pack, promote to live)** | **Future (US, BR, UK, …)** |
| --- | --- | --- | --- |
| Schema | `INDIA_PACK` live | `CANADA_PACK` ready; L0 promote on `/console/markets` | Draft → checklist → promote |
| Ledger | INR | Pack currency CAD; SaaS quotes still INR paise + PayPal FX for non-IN payers | Country pack |
| Tax on SaaS fee | GST 18% in quote | Pack GST/HST **demo 13%** labels/bps — not full provincial engine | Pack tax BPS + labels |
| Landlord MoR | Dodo / Stripe / demo | PayPal intl for `billing_country=CA`; pack lists Interac + Stripe **demo** | Pack MoR |
| Rent collect demo | UPI / eNACH | Interac/Stripe kinds on pack; landlord settings panel still Missing | Pack payment kinds |
| Shop | Razorpay keys | Pack-driven settings panel still Missing | Pack gateways |
| Seekers | Free | Free | Free |
| Runtime switch | `MarketProvider` + flag | Same — **live packs only** after promote | Same |

Prefs: Canada is **settings/preferences**, not a `/ca/*` shard. See [country-schema-switch.md](./country-schema-switch.md).

---

## 5. What NOT to charge seekers

Hard brand rules (prefs + pricing brief + tip billing):

1. **No brokerage** disguised as platform fee.  
2. **No owner-contact unlock packs** (NoBroker anti-pattern).  
3. **No paid “priority apply”** on MVP (deferred; only if funnel later needs a thin bump — never market as brokerage).  
4. Browse, map, Matterport, visit booking, apply, verify-with-landlord = **free**.  
5. KYC / OTP cost is platform/vendor ops — **not** a seeker SKU.  
6. Rent MoR (UPI/eNACH/Interac) is **landlord↔occupant**, not Easy Rental take-rate unless a future services SKU is explicitly sold.

---

## 6. Role ladder ↔ money surfaces (real routes)

| Level | Money-relevant UI (tip) | Real? |
| --- | --- | --- |
| L0 | `/cms/markets` checklist · `/console/*` · partner/refer queues | **Real** (markets = checklist, not full country pack CRUD) |
| L1 | Console + CMS (no `manageMarkets`) | **Real** |
| L2 | `/pricing` · `/pricing/subscribe` · `/landlord/billing` · `/landlord/settings` (currency, Razorpay, seats) | **Real** |
| L3 | Desk under landlord package | **Real** seats |
| L4 | Applicant / portal — no checkout for apply | **Real** free path |
| L5 | Provider intake / CMS verify | **Real** intake; take-rate not wired |

---

## 7. Related

- [country-schema-switch.md](./country-schema-switch.md) — how markets switch schema  
- [brief-pricing-plans-mvp.md](./brief-pricing-plans-mvp.md) · [learnings-nobroker-commercial-plans.md](./learnings-nobroker-commercial-plans.md)  
- [parking-lot-markets.md](./parking-lot-markets.md) · [brief-canada-market-switch.md](./brief-canada-market-switch.md)  
- [go-live-dependencies.md](./go-live-dependencies.md) · [secure-onboarding-journey.md](./secure-onboarding-journey.md)  
- Tip: `lib/billing/pricing.ts`, `lib/billing/routing.ts`, `lib/billing/fx.ts`, `lib/plans.ts`, `lib/market.ts`

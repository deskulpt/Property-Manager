# Country / market schema switch

**Product:** Easy Rental · DeSkulpt Inc.  
**Goal:** One UI; selecting a country swaps the **business schema** (currency, tax, payments, lease/eSign, SMS, address/ID) — not a `/ca/*` shard.  
**Tip audit:** `87d4c57` (2026-10-31) — L0 command center + `CountryPack` promote landed.  
**Companion:** [business-model-money.md](./business-model-money.md)

---

## 1. Intended model (prefs + briefs)

Prefs (Markets 2026-10-17) and [brief-canada-market-switch.md](./brief-canada-market-switch.md):

1. Header / settings flag → `market=IN|CA` (cookie + localStorage).  
2. Same routes; config pack swaps copy, money format, tax, payments, verify kinds.  
3. Landlord **Settings → Market & payments** shows gateways for active market.  
4. Admin adds countries via checklist → **promote** before public forms / runtime pack go live ([parking-lot-markets.md](./parking-lot-markets.md)).

---

## 2. Tip reality vs required screens (`87d4c57`)

Legend: **Real** · **Partial** · **Missing** · **Do not ship**

### 2.1 Market profile / UI switch

| Capability | Status | Tip evidence |
| --- | --- | --- |
| `CountryPack` schema + Zod | **Real** | `lib/markets/types.ts` · `CountryPackSchema` |
| Seeded IN + CA packs | **Real** | `lib/markets/packs.ts` — IN live fixture; CA demo (Interac/Stripe labels, HST 13% bps) |
| Pack store + promote/demote | **Real** | `lib/markets/store.ts` · `promoteCountryPack` / demote |
| `activeMarket()` from live pack | **Real** | `lib/market.ts` (+ session override for tests) |
| `MarketProvider` + header flags | **Real** | `components/market-provider.tsx` · `data-testid=market-flag-IN\|…` · live packs only |
| Market cookie helper | **Real** | `lib/markets/cookie.ts` |
| Landlord display currency INR/USD/CAD/GBP | **Real (FX view)** | `/landlord/settings` · `CurrencyForm`; IN ledger still INR until CA pack owns CAD ledger product decision |
| Dual-market Terms/Privacy | **Docs Real** | [terms-india-canada.md](./terms-india-canada.md) |
| Landlord Settings → Market & payments panel | **Missing** | Settings = currency + Razorpay; pack payment methods not yet mirrored in landlord settings UI |

### 2.2 Admin country pack / Markets UI

| Capability | Status | Tip evidence |
| --- | --- | --- |
| L0 Console Markets | **Real** | `/console/markets` · promote/demote packs · draft list |
| CMS Markets checklist | **Real** | `/cms/markets` · `/cms/markets/[id]` · 8 checklist keys |
| Complete draft → `publicFormCountries()` | **Partial** | Still adds ISO for forms; **runtime schema** requires promote |
| Parked ISO guard on draft create | **Real** | `createMarketDraft` rejects `PARKED_MARKET_ISOS` unless `allowParked` |
| Typed checklist editors (not free-text only) | **Partial / Missing** | Notes + done toggles remain; structured field editors not shipped |
| Fake `/ca/*` shard | **Do not ship** | Header copy + console lede forbid it |

### 2.3 Payments schema

| Capability | Status | Tip evidence |
| --- | --- | --- |
| Platform MoR IN → Dodo/Stripe/demo | **Real** | `lib/billing/routing.ts` |
| Platform MoR non-IN → PayPal (+ CAD/USD FX) | **Real** | Billing desk · `lib/billing/fx.ts` |
| Pack `platformMoR` + payment method kinds | **Real (data)** | IN: UPI/eNACH · CA pack: `interac` + `stripe_card` **demo labels** |
| Razorpay landlord shop | **Real (keys UI)** | `RazorpaySettings` |
| Live Interac / Stripe rent network | **Missing** | Demo hints only until go-live secrets |
| Settings dual-gateway panel driven by pack | **Missing** | See §2.1 |

### 2.4 Tax / money math

| Capability | Status | Tip evidence |
| --- | --- | --- |
| GST 18% on platform quote | **Real** | `quotePlatformBilling` (INR book) |
| Pack `gstBps` / tax labels | **Real** | IN 1800 · CA 1300 demo |
| HST/PST full provincial calc | **Missing** | Pack labels + jurisdiction prose; not full tax engine |
| Per-country SaaS CAD list prices | **Missing** | Quotes still INR paise; PayPal FX at settle |

### 2.5 Lease / eSign / SMS

| Capability | Status | Tip evidence |
| --- | --- | --- |
| Jurisdiction blurbs IN + CA | **Real** | `lib/agentic/jurisdictions.ts` |
| Pack `esignProviders` / `smsProvider` | **Real (data)** | IN digio/emudhra · CA includes `docusign` in pack list |
| Digio / eMudhra adapters | **Real** | `lib/agentic/esign.ts` — live gated |
| Runtime eSign/SMS pick strictly from pack | **Partial** | Env globals still primary; pack fields ready for wiring |
| OTP MSG91 / Twilio adapters | **Real** | `lib/otp/providers.ts` |

### 2.6 Listings / import

| Capability | Status | Tip evidence |
| --- | --- | --- |
| Import schema INR\|CAD + IN/CA sites | **Real** | `lib/import/listing-schema.ts` |
| Public CA inventory shard | **Missing / parked** | No seeded CA portfolio until promote + legal |

---

## 3. Runtime model (tip)

```
CountryPack {  // lib/markets/types.ts
  iso, name, locale,
  currency, minorExponent, gstBps, taxLabels[],
  phoneCc, postalRule, postalLabel, addressFieldOrder,
  idDocuments[], paymentMethods[],
  platformMoR: { domestic, intl? },
  esignProviders[], smsProvider,
  rentBasisDefault, areaDisplayUnit,
  jurisdictionPresetRef?, legalCopyKeys[]
}
```

**Flow:** checklist draft → (optional) mark ready → L0 **promote** on `/console/markets` → pack `live` → `MarketProvider` flag offers ISO → `activeMarket()` drives labels/formatters. **No parallel page tree.**

**Billing:** INR quote book for platform SaaS; non-IN **payers** still settle via PayPal CAD/USD FX. CA pack currency is schema/display until CAD ledger decision.

---

## 4. L0 country pack CRUD — residual checklist

Much of L0.0–L0.3 landed in `87d4c57`. Remaining for Admin / money follow-ups:

### Done on tip

- [x] `CountryPack` DB/store + IN/CA fixtures  
- [x] Promote / demote on `/console/markets`  
- [x] Parked ISO guard (`allowParked`)  
- [x] `MarketProvider` + header flags for **live** packs  
- [x] Console Markets in L0 command center  

### Still open

- [ ] Typed checklist editors (currency/E.164/payment enums) instead of notes-only  
- [ ] Landlord **Settings → Market & payments** driven by active pack (Interac/Stripe demo vs Razorpay)  
- [ ] Wire eSign + SMS **runtime** resolvers to `pack.esignProviders` / `pack.smsProvider` (env fallback OK)  
- [ ] HST/PST calc or explicit “labels only” product lock  
- [ ] CAD SaaS price book **or** document permanent INR MoR + display FX  
- [ ] Legal copy gate before CA promote in production  
- [ ] No seeker fees · no `/ca/*` · no live Interac without go-live keys  

### Do not

- Seed CA portfolio before promote + counsel  
- Claim Interac/Stripe live without [go-live-dependencies.md](./go-live-dependencies.md) secrets  

---

## 5. Gaps (post–ER-27)

| Gap | Owner hint |
| --- | --- |
| Landlord market-payments settings panel | Desk UX |
| Pack-driven eSign/SMS resolution | Lease onboard / OTP |
| Dual meter public pricing vs per-unit tip billing | [business-model-money.md](./business-model-money.md) §4.2 |
| Provincial tax engine | Money / CA pack |

---

## 6. File map (tip `87d4c57`)

| Area | Paths |
| --- | --- |
| Packs | `lib/markets/{types,packs,store,cookie}.ts` |
| Market runtime | `lib/market.ts` · `components/market-provider.tsx` |
| Console | `app/console/markets/page.tsx` · `app/console/page.tsx` |
| CMS checklist | `app/cms/markets/*` · `lib/market-checklist.ts` · `lib/db.ts` (`createMarketDraft`) |
| Billing | `lib/billing/{pricing,routing,fx,*}.ts` · `components/billing/billing-desk.tsx` |
| Tests | `test/country-packs.test.ts` · `e2e/console.spec.ts` |

---

## 7. Related

- [business-model-money.md](./business-model-money.md)  
- [parking-lot-markets.md](./parking-lot-markets.md) · [brief-canada-market-switch.md](./brief-canada-market-switch.md)  
- [go-live-dependencies.md](./go-live-dependencies.md) · [ask-easy-lease-onboard.md](./ask-easy-lease-onboard.md)

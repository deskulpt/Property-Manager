# Compliance feature flags

Admin L0 console: `/console/compliance` (**Canada focus**; **India money parked**)  
Contract: `lib/markets/compliance-contract.ts` + `lib/markets/legal-overrides.ts`  
Catalog / sign-offs: `lib/markets/compliance-catalog.ts` (`INDIA_COMPLIANCE_PARKED`)  
Enforcement (do not bypass): `lib/markets/enforce.ts` (#47)  
**Hosting consumer:** Cloudflare + Canada origin launch pack (ER-48)  
**Direction:** **Canada-first**; **PARK India** (`in-pay` reserved, no build).  
**Convention:** CountryPack / money keys use camelCase (`ontarioConnectDirectPad`, …). Reserved **host rails** use hostname labels `ca-pay` / `in-pay` (not CountryPack toggles).

## CountryPack LEGAL keys (meta override `legal.flag.{ISO}.{key}`)

Defaults **OFF**. Money enables require a distinct L0/L1 peer (no self-approval).  
India money keys stay OFF while parked — enable/approve returns `india_parked`.

| Key | Markets | Money |
| --- | --- | --- |
| `razorpayIndianEntity` | IN | yes |
| `ontarioConnectDirectPad` | CA | yes |
| `caStripeTaxHst` | CA | yes |
| `inTaxMatrix` | IN | yes |
| `routeHolds` | IN | yes |
| `depositHolds` | IN/CA | yes |
| `mandatoryTenantSurcharge` | IN/CA | yes |
| `eStore` | IN/CA | yes |
| `concierge` | IN/CA | yes |
| `affiliate` | IN/CA | yes |
| `onStandardLeaseLive` | CA | no |
| `tgProductionLease` | IN | no |
| `realPiiAiConnectorsMedia` | IN/CA | no |

Hard-locked (not toggleable):

| Key | Note |
| --- | --- |
| `caTenantCardFee` | Disabled by product policy; Ontario residential legal risk (RTA s134) |
| `ontarioDamageDeposit` | No damage/security deposits — LMR ≤ 1 month + key at cost |
| `ontarioMlsImport` | Landlord-direct only — no MLS / PropTx / REALTOR.ca |
| `ontarioCommercialSales` | RTA residential only (TRESA s5(1)(j)) |
| `ontarioAutomatedEviction` | Official LTB N-forms + human review only |

Product enforce helpers: `lib/markets/ontario-rta.ts` + `assertOntario*` in `lib/markets/enforce.ts`.

Money enables: second-admin approve · no self-approval · **24h expiry** · dual-admin alerts · single-admin **kill-switch OFF**.

Audit CSV: `/api/console/compliance/audit` — UTF-8 · UTC · amount+currency+tax · hash + row count · date-range.

Go-live blockers (always unchecked in `/console/compliance`): Ontario lawyer written review · Stripe money-flow + RPAA/FINTRAC · Listing rights · RTA and privacy controls demonstrated.

## Host-rail payment planes (ER-48) — not CountryPack keys

| Flag id | Env | Host | Build / default |
| --- | --- | --- | --- |
| `ca-pay` | `EASYRENTAL_FLAG_CA_PAY` | `ca-pay.easyrental.space` | OFF — **stub focus** (Worker Stripe Connect + EU D1 unpublished); do not create DNS while OFF |
| `in-pay` | `EASYRENTAL_FLAG_IN_PAY` | `in-pay.easyrental.space` | OFF — **PARKED, no build**; do not create DNS |

Meta: `compliance.pay_plane.in-pay` / `compliance.pay_plane.ca-pay`. Console SoT; env is hosting mirror.

If ER-47/48 renames an id, update this file + `deploy/cloudflare/dns-records.json` + hosting docs in the same wave.

## dataResidency

Demo declaration only. Console shows **target location** separately from **actual location: unverified**. `enforcedByStorage: false`. No compliant/verified badges.

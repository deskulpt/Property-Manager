# Compliance feature flags

Admin L0 console: `/console/compliance` (**Canada focus**; **India money parked**)  
Contract: `lib/markets/compliance-contract.ts` + `lib/markets/legal-overrides.ts`  
Catalog / sign-offs: `lib/markets/compliance-catalog.ts` (`INDIA_COMPLIANCE_PARKED`)  
Enforcement (do not bypass): `lib/markets/enforce.ts` (#47)

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

Hard-locked (not toggleable): **CA tenant card fee** (`caTenantCardFee`) — label `Disabled by product policy; Ontario residential legal risk`. Counsel review + code release to change.

Money enables: second-admin approve · no self-approval · **24h expiry** · dual-admin alerts · single-admin **kill-switch OFF**.

Audit CSV: `/api/console/compliance/audit` — UTF-8 · UTC · amount+currency+tax · hash + row count · date-range.

Go-live blockers (always unchecked in `/console/compliance`): Ontario lawyer written review · Stripe money-flow + RPAA/FINTRAC · Listing rights · RTA and privacy controls demonstrated.

## Host-rail payment planes (ER-48) — not CountryPack keys

| Flag id | Env | Host | Default |
| --- | --- | --- | --- |
| `in-pay` | `EASYRENTAL_FLAG_IN_PAY` | `in-pay.easyrental.space` | OFF (**India parked**) |
| `ca-pay` | `EASYRENTAL_FLAG_CA_PAY` | `ca-pay.easyrental.space` | OFF (Canada focus) |

Meta: `compliance.pay_plane.in-pay` / `compliance.pay_plane.ca-pay`. Console SoT; env is hosting mirror. DNS must not exist while OFF.

## dataResidency

Demo declaration only. Console shows **target location** separately from **actual location: unverified**. `enforcedByStorage: false`. No compliant/verified badges.

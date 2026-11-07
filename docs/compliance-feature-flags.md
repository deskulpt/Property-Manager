# Compliance feature flags

Admin L0 console: `/console/compliance`  
Contract: `lib/markets/compliance-contract.ts` + `lib/markets/legal-overrides.ts`  
Catalog / sign-offs: `lib/markets/compliance-catalog.ts`  
Enforcement (do not bypass): `lib/markets/enforce.ts` (#47)

## CountryPack LEGAL keys (meta override `legal.flag.{ISO}.{key}`)

Defaults **OFF**. Money enables require a distinct L0/L1 peer (no self-approval).

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

Hard-locked (not toggleable): **CA tenant card fee** (`caTenantCardFee`) — RTA s134.

## Host-rail payment planes (ER-48) — not CountryPack keys

| Flag id | Env | Host | Default |
| --- | --- | --- | --- |
| `in-pay` | `EASYRENTAL_FLAG_IN_PAY` | `in-pay.easyrental.space` | OFF |
| `ca-pay` | `EASYRENTAL_FLAG_CA_PAY` | `ca-pay.easyrental.space` | OFF |

Meta: `compliance.pay_plane.in-pay` / `compliance.pay_plane.ca-pay`. Console SoT; env is hosting mirror. DNS must not exist while OFF.

## dataResidency

Declarative pack notes only (`enforcedByStorage: false`) until storage pins regions. Console shows notes — not a green “enforced” badge.

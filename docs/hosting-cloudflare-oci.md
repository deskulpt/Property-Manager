# Cloudflare Free + Canada origin — Easy Rental

**Product:** Easy Rental · `easyrental.space` · DeSkulpt Inc.  
**Status:** Docs + IaC only — **Canada-first**. Aloke creates a **Canada** origin when ready.  
**Decision:** **PARK India** — stop in-pay build and OCI India; `in-pay` reserved only.  
**Project store:** `docs/hosting-cloudflare-oci-launch.md` (ER-48).

## Architecture

Cloudflare Free front door (dedicated **EasyRental** CF account) → **Canada** origin (Oracle Always Free `ca-toronto-1` preferred) running Node/Next + SQLite.

| Plane | Host | Status |
| --- | --- | --- |
| App | `easyrental.space` · `www` | CF zone active; DNS empty until **CA** origin IP exists |
| CA payments | `ca-pay.easyrental.space` | **Stub focus** — flag `ca-pay` OFF; no DNS; Worker unpublished |
| India payments | `in-pay.easyrental.space` | **PARKED** — reserved name; no DNS; **no build** |

Payment planes are **separate services**, not the apex Node process.

## Cloudflare account (do not use old DeSkulpt CF)

| Field | Value |
| --- | --- |
| Plan | Free |
| Account ID | `b2c682e130b734a072424bbf92367668` |
| Zone | `easyrental.space` (**active**) |
| Nameservers | `bella.ns.cloudflare.com`, `keenan.ns.cloudflare.com` |
| DNS as of 2026-11-07 | **ZERO records** |

## Exact DNS

Source of truth: [`deploy/cloudflare/dns-records.json`](../deploy/cloudflare/dns-records.json).  
Apply (dry-run default): `./scripts/hosting/cloudflare-dns-apply.sh`.

### Create after Canada origin exists

| Name | Type | Content | Proxy |
| --- | --- | --- | --- |
| `@` | A | `$ORIGIN_PUBLIC_IPV4` (or `$OCI_PUBLIC_IPV4`) | Proxied |
| `@` | AAAA | `$ORIGIN_PUBLIC_IPV6` (optional) | Proxied |
| `www` | CNAME | `easyrental.space` | Proxied |

### Do not create

- `ca-pay` — Admin flag `ca-pay` OFF (stub Worker only)
- `in-pay` — PARKED; flag OFF; **no build**

### Mail (only if app sends mail)

OTP/email can use Resend. Add MX/SPF/DKIM/DMARC only when enabling a real sender — see placeholders in `dns-records.json`.

## Compliance toggles (shared with Admin console ER-47)

| Flag | Default | Effect |
| --- | --- | --- |
| `ca-pay` | OFF | No DNS; Stripe Connect Worker + EU D1 unpublished |
| `in-pay` | OFF | PARKED — no India payment plane build |
| `ontarioConnectDirectPad` | OFF | Ontario Connect DIRECT+PAD dark |
| `razorpayIndianEntity` | OFF | Indian-entity Razorpay dark (parked) |
| `caStripeTaxHst` / `inTaxMatrix` | OFF | Live tax dark |
| `realPiiAiConnectorsMedia` | OFF | Real-PII AI/media blocked |

```bash
EASYRENTAL_FLAG_CA_PAY=0
EASYRENTAL_FLAG_IN_PAY=0
```

## Canada origin (Aloke when ready)

1. Region: **ca-toronto-1** (or ca-montreal-1).
2. Always Free shape + public IPv4.
3. Mount `/data` for SQLite + uploads.
4. `scripts/hosting/oci-bootstrap.sh` → `deploy-app.sh`.
5. Set `ORIGIN_PUBLIC_IPV4` and apply apex + www DNS only.
6. `scripts/hosting/verify-health.sh https://easyrental.space`

Terraform: `deploy/oci/main.tf` (default region **ca-toronto-1**).

### PARKED — OCI India / in-pay

Do not provision `ap-mumbai-1`. Do not build an in-pay service. Hostname remains reserved only.

## ca-pay / Stripe Connect (stub, OFF)

- Host later: `ca-pay.easyrental.space`
- Stub: `deploy/cloudflare/workers/ca-pay/` (503 while flag OFF)
- Stripe Connect + EU D1 bindings commented in `wrangler.toml`
- Pair with `ontarioConnectDirectPad` OFF

## Related docs

- [`setup.md`](./setup.md) — local + env
- [`compliance-feature-flags.md`](./compliance-feature-flags.md) — flag contract
- [`railway.md`](./railway.md) — optional alternate host; preferred public path is **CF + Canada origin**

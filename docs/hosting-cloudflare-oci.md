# Cloudflare Free + OCI Always Free (India) — Easy Rental

**Product:** Easy Rental · `easyrental.space` · DeSkulpt Inc.  
**Status:** Docs + IaC only — Aloke creates the OCI VM later.  
**Project store (canonical narrative):** see Project `docs/hosting-cloudflare-oci-launch.md` (ER-48).

## Architecture

Cloudflare Free front door (dedicated **EasyRental** CF account) → Oracle Always Free **India** VM running the existing Node/Next + SQLite app.

| Plane | Host | Status |
| --- | --- | --- |
| App | `easyrental.space` · `www` | CF zone active; DNS empty until OCI IP exists |
| India payments | `in-pay.easyrental.space` | Reserved — **do not create DNS**; flag `in-pay` OFF |
| CA/EU payments | `ca-pay.easyrental.space` | Reserved — **do not create DNS**; flag `ca-pay` OFF |

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

### Create after OCI exists

| Name | Type | Content | Proxy |
| --- | --- | --- | --- |
| `@` | A | `$OCI_PUBLIC_IPV4` | Proxied |
| `@` | AAAA | `$OCI_PUBLIC_IPV6` (optional) | Proxied |
| `www` | CNAME | `easyrental.space` | Proxied |

### Do not create yet

- `in-pay` — gated by Admin flag `in-pay` (default OFF)
- `ca-pay` — gated by Admin flag `ca-pay` (default OFF)

### Mail (only if app sends mail)

OTP/email can use Resend (`RESEND_API_KEY`). **Add MX/SPF/DKIM/DMARC only when enabling a real sender** — placeholders are commented in `dns-records.json`. Prefer `noreply@easyrental.space` after DNS is live.

## Compliance toggles (shared with Admin console ER-47)

| Flag | Default | Effect |
| --- | --- | --- |
| `in-pay` | OFF | No `in-pay` DNS / IN payment service |
| `ca-pay` | OFF | No `ca-pay` DNS / Worker + EU D1 |
| `ontarioConnectDirectPad` | OFF | Ontario Connect DIRECT+PAD dark |
| `razorpayIndianEntity` | OFF | Indian-entity Razorpay dark |
| `caStripeTaxHst` / `inTaxMatrix` | OFF | Live tax dark |
| `realPiiAiConnectorsMedia` | OFF | Real-PII AI/media blocked |

Env on OCI (keep off):

```bash
EASYRENTAL_FLAG_IN_PAY=0
EASYRENTAL_FLAG_CA_PAY=0
```

## OCI Always Free (Aloke later)

1. Region: **ap-mumbai-1** (India).
2. Always Free shape (A1 Flex or available micro) + public IPv4.
3. Mount `/data` for SQLite (`DESKULPT_DB_PATH=/data/deskulpt.sqlite`) + uploads.
4. Bootstrap: `scripts/hosting/oci-bootstrap.sh`
5. Deploy: `scripts/hosting/deploy-app.sh`
6. Set `OCI_PUBLIC_IPV4` and apply DNS (apex + www only).
7. Verify: `scripts/hosting/verify-health.sh https://easyrental.space`

Terraform stub: `deploy/oci/main.tf` (no apply until credentials exist).

## India payment plane (reserved, OFF)

- Host: `in-pay.easyrental.space`
- India-resident payment data + **180-day** IN security logs
- Separate service; flag `in-pay`

## CA payment plane (reserved, OFF)

- Host: `ca-pay.easyrental.space`
- CF Worker + Stripe Connect + **EU D1** ledger
- Stub: `deploy/cloudflare/workers/ca-pay/` (unpublished)
- Flag `ca-pay`

## Related docs

- [`setup.md`](./setup.md) — local + env
- [`railway.md`](./railway.md) — optional prior host path (volume + SQLite); **preferred public path is CF + OCI India**

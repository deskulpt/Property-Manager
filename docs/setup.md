# Setup

```bash
git clone https://github.com/deskulpt/Property-Manager.git
cd Property-Manager
cp .env.example .env.local   # set DESKULPT_SECRET_KEY for production-like runs
npm install
npm run dev                  # http://127.0.0.1:43123/
```

First request creates `data/deskulpt.sqlite` and loads the labelled DEMO seed.

```bash
npm run reset   # restore seed (stop dev server first)
npm test
npm run build && npm start
```

## Env vars

See `.env.example` and `lib/env.ts` `ENV_CHECKLIST`.

| Variable | Production |
| --- | --- |
| `DESKULPT_SECRET_KEY` | **Required** (≥16 chars) |
| `DESKULPT_DB_PATH` | Persistent volume path |
| `DESKULPT_DEMO_SWITCHER` | `0` / unset |
| `NODE_ENV` | `production` |
| `PORT` | Railway sets this; `npm start` defaults to 43123 locally |

## Deploy (preferred: Cloudflare Free + Canada origin)

See [`docs/hosting-cloudflare-oci.md`](./hosting-cloudflare-oci.md) and `deploy/`.

1. Zone `easyrental.space` is already on the **dedicated EasyRental** Cloudflare Free account (`b2c682e130b734a072424bbf92367668`; NS bella/keenan). DNS starts empty.
2. Aloke creates a **Canada** origin when ready (OCI Always Free `ca-toronto-1` preferred); set `ORIGIN_PUBLIC_IPV4` and apply apex + `www` only via `scripts/hosting/cloudflare-dns-apply.sh`.
3. Persist SQLite on the VM at `/data` (`DESKULPT_DB_PATH=/data/deskulpt.sqlite`); set `DESKULPT_SECRET_KEY`, `HOSTED=1`, leave payment-plane flags OFF.
4. **ca-pay** stub stays OFF (no DNS). **in-pay** is **PARKED** — reserved name only, no build. Do not create either DNS record.
5. Health check: `/api/health`.

### Optional: Railway

[`docs/railway.md`](./railway.md), `railway.json`, and `Dockerfile` remain valid for a volume-backed alternate host. Preferred public path is **CF + Canada origin**.

Postgres migration is still planned; SQLite on a volume is the near-term path.

## Docs index

- [Architecture](./architecture.md)
- [Landlord manual](./landlord-manual.md)
- [Tenant manual](./tenant-manual.md)
- [FAQ](./faq.md)

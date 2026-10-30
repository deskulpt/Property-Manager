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

## Deploy (Railway — ready, not deployed)

See [`docs/railway.md`](./railway.md), `railway.json`, and optional `Dockerfile`.

1. Create a Railway project from this GitHub repo (Nixpacks or Dockerfile).
2. Attach a **volume** at `/data`; set `DESKULPT_DB_PATH=/data/deskulpt.sqlite`.
3. Set `DESKULPT_SECRET_KEY` (random ≥16 chars). Leave `DESKULPT_DEMO_SWITCHER` unset.
4. Health check: `/api/health` (wired in `railway.json`).
5. Billing / OTP / KYC: set `BILLING_PROVIDER`, `OTP_SMS_PROVIDER`, `KYC_PROVIDER` as needed; keep `*_LIVE=0` for test mode.
6. Custom domain → `easyrental.space` when ready.

Postgres migration is still planned; SQLite on a volume is the near-term path.

## Docs index

- [Architecture](./architecture.md)
- [Landlord manual](./landlord-manual.md)
- [Tenant manual](./tenant-manual.md)
- [FAQ](./faq.md)

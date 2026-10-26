# Railway deploy readiness

Not deployed from this PR — checklist only.

## Service

1. New Railway project from this GitHub repo (Nixpacks via `railway.json`, or Dockerfile).
2. Attach a **volume** mounted at `/data`.
3. Set env (see `.env.example`):
   - `DESKULPT_SECRET_KEY` (≥16 chars) **required**
   - `DESKULPT_DB_PATH=/data/deskulpt.sqlite`
   - `NODE_ENV=production`
   - `PORT` (Railway injects)
   - `BILLING_PROVIDER=dodo` (or `stripe` / `demo`) — India / primary
   - `BILLING_INTL_PROVIDER=paypal` — NRI / international (sandbox)
   - PayPal sandbox vars when testing intl: `PAYPAL_WEBHOOK_SECRET`, optional `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`
   - `DESKULPT_DEMO_SWITCHER=0`
4. Health check: `GET /api/health` (already in `railway.json`).
5. Uploads land under `data/uploads` relative to cwd — for Docker image set working dir and ensure `/data` is writable; prefer pointing uploads at the volume in a follow-up if needed.

## Billing / OTP / KYC (test mode)

Leave live flags off (`DODO_LIVE`, `PAYPAL_LIVE`, `OTP_LIVE`, `KYC_LIVE` unset). Webhook URLs when testing:

- `/api/billing/webhook` (add `?provider=paypal` or PayPal transmission headers for intl)
- `/api/kyc/webhook`

# Architecture

## Stack

- Next.js 16 App Router, React 19, TypeScript
- SQLite via `node:sqlite` (`lib/db.ts`, seed in `lib/seed-demo.ts`)
- Zod validation, Tailwind 4, shadcn/Base UI
- Hosting target: **Railway** (Node 22+)

## Multi-tenancy

- `tenants` (platform | landlord) with `is_demo`
- Users scoped by `tenant_id` (applicants/providers may be null)
- Landlord queries always filter by `tenant_id`
- Demo switcher only lists `users.is_demo = 1` and is **off in production** unless `DESKULPT_DEMO_SWITCHER=1`

## Listings model

`properties` + `units` with `segment` / `subtype`, `rate_basis`, JSON `attributes`.

Segments: `warehouse` | `commercial` | `residential`. Lease profile helpers choose GST, deposit, and maintenance lines on approve.

## Auth

- Landlord email/password (bcrypt)
- Signed session cookie `deskulpt_user` (`v1.<userId>.<hmac>`) via `DESKULPT_SECRET_KEY`
- Demo switcher gated; cannot mint sessions for non-demo users
- Cookie flags: `httpOnly`, `sameSite=lax`, `secure` in production

## Payments / KYC

Interfaces only for rent (`lib/payments.ts`) and KYC provider refs. Shop can store encrypted Razorpay secrets (AES-GCM).

## Key paths

| Area | Location |
| --- | --- |
| Server actions | `lib/actions.ts` |
| Schema + queries | `lib/db.ts` |
| Demo seed | `lib/seed-demo.ts` |
| Env helpers | `lib/env.ts` |
| OTP | `lib/otp.ts` + in-memory rate limit |
| Health | `GET /api/health` |

## Data model (core tables)

`tenants`, `users`, `properties`, `units`, `applications`, `ledger_entries`, `payment_methods`, `verifications`, `otp_challenges`, `consent_events`, `jobs`, `provider_approvals`, `notices`, `shop_*`, `markets` / checklist.

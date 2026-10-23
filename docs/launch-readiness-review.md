# EasyRent launch readiness review

**Branch:** `cursor/multi-segment-expansion-5d1a`  
**PR:** https://github.com/deskulpt/Property-Manager/pull/12 (draft — do not merge until Aloke signs off)  
**Date:** 2026-10-20  
**Owner ask:** Security + data leaks, lean demo seed, prod sanity, manuals/FAQ/dev docs, unfinished-feature rundown.

---

## Executive summary

The multi-segment MVP (warehouse / commercial / residential) plus launch hardening is on PR #12. **Critical auth/session and upload issues from the security pass are fixed** (signed cookies, gated demo switcher, floor-plan path checks, SVG blocked, OTP rate limits + hashed codes, no Aadhaar image path, signup consent + export/erasure). Seed is reduced to **one labelled demo landlord** (`DEMO · EasyRent Hyderabad`) with supporting applicants/staff/provider. Docs and in-app help exist. **Not launch-complete for money or identity:** live payments/billing, SMS OTP, licensed KYC, Postgres, and several product stubs remain. Repo is public MIT — treat demo fixtures and local default secret accordingly.

---

## 1. Security & data-leak findings

### Fixed in this PR

| Area | Finding | Fix |
| --- | --- | --- |
| Session | Unsigned `deskulpt_user` cookie = raw user id | HMAC-signed `v1.<id>.<sig>`; legacy unsigned rejected in production |
| Demo switcher | Anyone could impersonate any user incl. super_admin | Gated by `isDemoSwitcherEnabled()`; only `is_demo=1` users |
| Floor plans | Path traversal / write before tenant check | Ownership check first; safe filename; no SVG |
| `/files/*` | SVG XSS + weak path rules | Raster types only; basename allowlist; path resolve check |
| Shop crypto | Hardcoded AES fallback always usable | `requireSecretKey()` throws in production if unset |
| Cookies | Missing `Secure` | `secure: true` when `NODE_ENV=production` |
| OTP | Fixed code returned; no rate limit | Hashed at rest; rate limit request/verify; demo code only outside prod |
| Login | Email enumeration | Generic “Email or password is incorrect.” |
| KYC / Aadhaar | Aadhaar-labeled docs / seed PDF | Provider-ref only; reject Aadhaar-number patterns; seed `kyc_provider` |
| Headers | Missing basics | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` |
| DPDP | No consent / export path | Signup checkbox → `consent_events`; download + applicant erasure UI |
| Health | — | `GET /api/health` (503 if secret missing in prod) |

### Residual / could not fully fix

| Item | Why | Risk if public |
| --- | --- | --- |
| Demo OTP code `246810` in non-prod | Needed for local/e2e without SMS | Low if prod never enables demo code path (guarded) |
| In-memory rate limit | Resets per process; not shared across Railway replicas | Medium for OTP abuse until Redis/Postgres limiter |
| No app-level CSRF tokens | Relies on Next.js Server Actions origin checks + `SameSite=Lax` | Acceptable for cookie sessions; document for API expansion |
| Public MIT + fixture emails / Matterport IDs | Intentional demo content | Low; no live secrets in tree |
| Local default `DESKULPT_SECRET_KEY` fallback | Dev convenience; **must** set on Railway | High if someone runs `NODE_ENV=production` without env |
| npm audit: transitive high/critical (vitest/tinypool, shadcn→fast-glob/braces, MCP SDK unused path, etc.) | Breaking upgrades (`vitest@5`, `shadcn@1`) not applied blindly; Next bumped to 16.3.8 | Dev-toolchain risk higher than runtime for most |
| Landlord org erasure | Self-service redacts applicants only; org delete needs operator path | Product gap, not IDOR |
| CMS cross-tenant applicant list for staff | By design for platform roles; gated by role + signed session | OK if super_admin stays demo-only on public hosts |
| No CSP | Matterport iframes / Pannellum complicate a strict CSP | Medium XSS hardening remaining |
| Git history | No live API keys found in current tree; default demo secret string exists in source as local fallback | Do not reuse that string in production |

### Public-repo notes

- Never commit `.env` / real Razorpay keys / Translation API keys.
- Keep `DESKULPT_DEMO_SWITCHER=0` on any host with real signups.
- Seed emails use `.example` domains; still do not treat them as production test accounts for real PII.

---

## 2. Launch readiness (ops)

| Item | Status |
| --- | --- |
| Env checklist | `.env.example` + `lib/env.ts` `ENV_CHECKLIST` |
| Health | `/api/health` |
| Error page | `app/error.tsx` (digest only, no stack) |
| Build | `npm run build` (verify in CI / this run) |
| Railway | **Not deployed.** Needs: Node 22 service, volume for SQLite+uploads (`DESKULPT_DB_PATH`), `DESKULPT_SECRET_KEY`, start `npm start` / honor `$PORT`, health `/api/health`, domain → easyrental.space |
| Demo seed | Single landlord tenant labelled **DEMO · EasyRent Hyderabad**; real signups `is_demo=0` excluded from switcher |

---

## 3. Documentation shipped

| Doc | In-app | Markdown |
| --- | --- | --- |
| Landlord manual | `/help/landlord` | `docs/landlord-manual.md` |
| Tenant manual | `/help/tenant` | `docs/tenant-manual.md` |
| FAQ (warehouse/commercial/residential, deposits, GST, KYC, cancel, NRI, pricing) | `/help/faq` | `docs/faq.md` |
| Architecture / data model | — | `docs/architecture.md` |
| Setup / env / Railway notes | — | `docs/setup.md` |
| Privacy (DPDP) | `/legal/privacy` | (page) |
| README | Updated seed + help links | root `README.md` |

Pricing copy stays generic (“see pricing”). Planned shape: Free = 1 unit; then per-unit INR + 18% GST.

---

## 4. Unfinished / stubbed features

| Feature | What’s missing | User impact | Launch blocker? | Size |
| --- | --- | --- | --- | --- |
| **Payments / billing (SaaS)** | No plan checkout; provider undecided (**Dodo Payments** MoR vs **Stripe**); no INR GST invoices for platform fees | Cannot charge landlords for Free→paid | **Yes** for monetized launch; **No** for private beta with free access | L |
| **Live rent collection** | Demo UPI/eNACH adapter only; no NPCI/bank | Occupants cannot pay real rent in-app | **Yes** if promising live rent; **No** if ledger-demo OK | L |
| **Shop Razorpay live charge** | Keys stored encrypted; no live HTTP capture | Shop checkout stays demo | No for core leasing | M |
| **Live KYC** | No IDfy/Signzy/HyperVerge redirect; simulated score | Not a real identity check | **Yes** if marketing “verified tenants” | M–L |
| **SMS / email OTP** | Local hash + demo code; no SMS/email provider | Phone verify is theatre in prod without a sender | **Yes** for phone-gated flows | M |
| **Transactional email** | `email_demo` inbox rows only | No real notices to mailbox | Soft blocker for ops | M |
| **11-month agreements** | Copy/seed mention only; no e-sign / PDF generation | Landlords still use offline agreements | Soft | M |
| **Police verification** | Not implemented | Manual offline | Soft / segment-specific | M |
| **HRA receipts** | Not implemented | Tenants cannot download rent receipts for HRA | Soft for residential | S–M |
| **Postgres** | SQLite only | Scaling / HA / Railway multi-instance painful | Soft for early launch with volume; **Yes** before multi-region | L |
| **Cancellation / notice workflow** | Deny application only; no lease end / notice period | Manual WhatsApp for exits | Soft | M |
| **Refer / SEO crawler / Canada markets** | Parked or brief-only | N/A for India launch | No | — |
| **Custom domains (PRO)** | Partial DNS demo force | Marketing hostname limited | No | S |
| **Ask Easy / visits** | UI stubs / light features | Low trust if oversold | Soft | S–M |

---

## 5. Verification commands

```bash
npm run lint
npm test          # isolation + shop + segment-expansion
npm run build
# optional: DESKULPT_DEMO_SWITCHER=1 DESKULPT_SECRET_KEY=… npm run test:e2e
npm audit         # residual toolchain advisories documented above
```

Warehouse approve → rent + GST path remains covered by Vitest isolation + Playwright leasing path (Nadia → Maya).

---

## 6. Recommended go-live checklist (Aloke)

1. Railway volume + `DESKULPT_SECRET_KEY` + `DESKULPT_DEMO_SWITCHER` unset  
2. Decide billing MoR (Dodo vs Stripe) and ship Free/1-unit gating  
3. Contract KYC vendor; remove any remaining “demo match” language from marketing  
4. Wire SMS (or email) OTP; never return OTP codes in production responses  
5. Replace SQLite with Postgres before multi-instance  
6. Legal review of Privacy/Terms for fiduciary language  
7. Keep PR #12 draft until the above blockers you care about are accepted or deferred in writing  

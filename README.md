# DeSkulpt

Open-source, multi-tenant property desk for **Indian** industrial landlords, plus a **SaaS Super Admin Org** (DeSkulpt India Pvt Ltd) that onboards landlords, verifies providers, and merchandises listings through a role-scoped persona CMS.

Applicants browse a filterable listings directory and apply. Landlord admins approve them, place units on a floor plan, and assign concierge jobs. Service providers accept work only after that landlord has approved them for the building’s area. Platform staff open `/cms` with permissions that isolate PII by role.

Market seam: India only for now (INR, UPI, eNACH, Aadhaar, PIN, +91). NRI landlords can **display** amounts in USD, CAD, or GBP — the ledger charge currency stays INR. OTP accepts international E.164 numbers.

## Run it

Requires Node.js 22 or newer. No API keys.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). The first request creates `data/deskulpt.sqlite` and loads the demo portfolio. The server binds dual-stack (`::`) on port **43123**.

```bash
npm run reset          # restore the demo seed (stop the dev server first, or set DESKULPT_DB_PATH)
npm test               # isolation + command tests (temp SQLite)
npm run test:e2e       # Playwright leasing path on a throwaway DB/port
```

## Demo identities

Use the **Demo** switcher in the header. There is no password.

| Person | Role | What to try |
| --- | --- | --- |
| Avery Quinn | Super Admin | Full CMS: staff, landlords, applicants, providers, listings |
| Sam Rivera | Account Manager | Landlords + applicants; invite a demo landlord |
| Priya Nair | Service Manager | Verify providers; approve for a landlord |
| Chris Vogel | Property Manager | Applicants (masked email) + listing readiness |
| Jordan Blake | Merchandiser | Listing readiness only — no emails |
| Maya Chen | Applicant | Apply, Aadhaar verification, phone OTP |
| Devon Hale | Applicant | Ledger: rent + GST due, late fee, eNACH paid |
| Nadia Okonkwo | BBM Logistics Parks admin | Inbox, floor plan, concierge, providers |
| Jonah Ellis | Harbourline Yards India admin | Empty application inbox |
| Meera Sahni | Sahni Global Realty (NRI) | USD display currency, +1 phone, settings |
| Luis Ortega | Electrician, Bhiwandi | Accept / complete assigned jobs |

## Key routes

- `/listings` — unit search with full filters
- `/properties` — building portfolio
- `/cms` — persona CMS (platform staff only)
- `/landlord`, `/landlord/settings`, `/provider`, `/account` — market desks

## What is real in this build, and what is simulated

Real: listings filters, applications, approve and deny, floor-plan upload and hotspots, provider approval filtered by area, job accept and complete, late-fee and GST arithmetic, the INR ledger, landlord display-currency preference (demo FX table), international demo OTP, the in-app inbox, the PWA, platform CMS with role redaction, demo landlord invite.

Simulated, on purpose:

- Verification never calls UIDAI or any government API and does not store a biometric template.
- Payments use a demo UPI / eNACH adapter. No bank is contacted.
- FX conversion uses a labeled demo rate table in code — not a live FX API.
- OTP send/verify is local demo only. No SMS provider.
- Email, web push, and WhatsApp are logged in-app. No provider key is required.

## Stack

Next.js (App Router), TypeScript, Tailwind, shadcn/ui, GSAP, Zod, SQLite via `node:sqlite`, Pannellum (MIT) for 360 photos. Matterport is an iframe URL only.

## Licence

MIT. See `LICENSE`. GSAP is the one dependency under its own no-fee standard licence rather than an OSI licence. It is free for commercial use.

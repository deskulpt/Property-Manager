# DeSkulpt

Open-source, multi-tenant property desk for industrial landlords, plus a **SaaS Super Admin Org** (DeSkulpt Inc.) that onboard landlords, verify providers, and merchandise listings through a role-scoped persona CMS.

Applicants browse a filterable listings directory and apply. Landlord admins approve them, place units on a floor plan, and assign concierge jobs. Service providers accept work only after that landlord has approved them for the building’s area. Platform staff open `/cms` with permissions that isolate PII by role.

The visual system — paper ground, blueprint grid, Archivo and Newsreader — follows the BBM Waterman leasing proposal. Two seeded landlord organisations (BBM Waterman and Harbourline Yards) make tenancy isolation visible.

## Run it

Requires Node.js 22 or newer. No API keys.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). The first request creates `data/deskulpt.sqlite` and loads the demo portfolio. The server binds dual-stack (`::`) on port **43123**.

## Demo identities

Use the **Demo** switcher in the header. There is no password.

| Person | Role | What to try |
| --- | --- | --- |
| Avery Quinn | Super Admin | Full CMS: staff, landlords, applicants, providers, listings |
| Sam Rivera | Account Manager | Landlords + applicants; invite a demo landlord |
| Priya Nair | Service Manager | Verify providers; approve for a landlord |
| Chris Vogel | Property Manager | Applicants (masked email) + listing readiness |
| Jordan Blake | Merchandiser | Listing readiness only — no emails |
| Maya Chen | Applicant | Apply, verification wizard |
| Devon Hale | Applicant | Ledger: rent due, late fee, paid |
| Nadia Okonkwo | BBM Waterman admin | Inbox, floor plan, concierge, providers |
| Jonah Ellis | Harbourline admin | Empty application inbox |
| Luis Ortega | Electrician, East York | Accept / complete assigned jobs |

## Key routes

- `/listings` — unit search with full filters
- `/properties` — building portfolio
- `/cms` — persona CMS (platform staff only)
- `/landlord`, `/provider`, `/account` — market desks

## What is real in this build, and what is simulated

Real: listings filters, applications, approve and deny, floor-plan upload and hotspots, provider approval filtered by area, job accept and complete, late-fee arithmetic, the ledger, the in-app inbox, the PWA, platform CMS with role redaction, demo landlord invite.

Simulated, on purpose:

- Verification never calls UIDAI or any government API and does not store a biometric template.
- Payments use a demo adapter. No card is charged.
- Email and web push are logged in-app. No provider key is required.

## Stack

Next.js (App Router), TypeScript, Tailwind, shadcn/ui, GSAP, Zod, SQLite via `node:sqlite`, Pannellum (MIT) for 360 photos. Matterport is an iframe URL only.

## Licence

MIT. See `LICENSE`. GSAP is the one dependency under its own no-fee standard licence rather than an OSI licence. It is free for commercial use.

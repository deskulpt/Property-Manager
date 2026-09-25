# DeSkulpt

Open-source, multi-tenant property desk for industrial landlords. Applicants browse bays and apply. Landlord admins approve them, place units on a floor plan, and assign concierge jobs. Service providers accept work only after that landlord has approved them for the building’s area.

The visual system — paper ground, blueprint grid, Archivo and Newsreader — follows the BBM Waterman leasing proposal. The running app is the product that proposal described, with two seeded landlord organisations so tenancy isolation is visible.

## Run it

Requires Node.js 22 or newer. No API keys.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). The first request creates `data/deskulpt.sqlite` and loads the demo portfolio.

## Demo identities

Use the **Demo** switcher in the header. There is no password.

| Person | Role | What to try |
| --- | --- | --- |
| Maya Chen | Applicant | Apply, run the verification wizard |
| Devon Hale | Applicant | Ledger: rent due, late fee, paid |
| Nadia Okonkwo | BBM Waterman admin | Inbox, floor plan, concierge, providers |
| Jonah Ellis | Harbourline admin | Empty application inbox, his own jobs |
| Luis Ortega | Electrician, East York | Accept the weather-seal job |
| Amrita Singh | Plumber, Port Lands | Empty until Harbourline assigns her |

## What is real in this build, and what is simulated

Real: browsing, applications, approve and deny, floor-plan upload and hotspots, provider approval filtered by area, job accept and complete, late-fee arithmetic, the ledger, the in-app inbox, the PWA manifest and service worker.

Simulated, on purpose:

- Verification never calls UIDAI or any government API and does not store a biometric template.
- Payments use a demo adapter. No card is charged.
- Email and web push are logged in-app. No provider key is required.

## Stack

Next.js (App Router), TypeScript, Tailwind, shadcn/ui, GSAP, Zod, SQLite via `node:sqlite`, Pannellum (MIT) for 360 photos. Matterport is an iframe URL only.

## Licence

MIT. See `LICENSE`. GSAP is the one dependency under its own no-fee standard licence rather than an OSI licence. It is free for commercial use.

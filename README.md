# Easy Rental

**Easy Rental** ([easyrental.space](https://easyrental.space)) is a product of **DeSkulpt Inc.**

Easy Rental (Property Manager) is an open-source, multi-tenant desk for **Indian industrial landlords**. A platform organisation, **DeSkulpt India Pvt Ltd**, onboards landlords, verifies providers, and merchandises listings through a role-scoped persona CMS. Landlord organisations keep their own properties, applications, jobs, and ledger. Applicants browse bays and apply. Service providers see only work a landlord has assigned after approving them for that building's area.

The interface is English. Copy lives in `locales/en.json`. This repository is a working demo: the first request creates a local SQLite file and loads a seeded portfolio. It is not a live tenancy, a credit decision, or a payment account.

Canonical repository: https://github.com/deskulpt/Property-Manager

## Visual system

The public UI uses a **blueprint-paper / industrial leasing** look — cool drafting paper, steel navy brand, cyan mark accent — not cream/terracotta or purple SaaS skins.

| Token | Role |
| --- | --- |
| Paper `#eef2f5` | Cool drafting background with a light grid |
| Brand `#13253a` | Steel navy for chrome and primary CTAs |
| Mark `#0e6e8c` | Cyan accent (CSS token name `terra` is retained) |
| Type | **Syne** (brand / headings), **IBM Plex Sans** (body), **IBM Plex Mono** (specs and labels) |

The marketing home is brand-first: **Easy Rental.** is the hero signal in the first viewport (one composition, full-bleed atmosphere). GSAP drives three motions on that page only — brand settle, hero rise, scroll reveals — and respects `prefers-reduced-motion`.

### Role-clear navigation

The header always shows browse links (Listings, Map, Portfolio). After you pick an identity, only that role’s desk appears (Landlord desk, Applicant desk, Provider desk, or CMS desk), plus Inbox. Desks are not dumped as one flat link list for every visitor.

## Current market

**India only.** The live market code is `IN`. Public forms offer India. Rent, fees, GST, and the ledger are charged in **INR**. Warehouse rates are **₹ / SF · month**; commercial and residential use flat monthly rent. GST on warehouse/commercial rent is 18% (residential defaults off). Address capture uses a 6-digit PIN code. The default phone country code is +91. Seeded payment methods are **UPI (demo)** and **eNACH / auto-debit (demo)**. Verification for India uses a **licensed KYC provider reference** — not Aadhaar images. None of those paths call NPCI, a bank, or UIDAI.

Web and an installable PWA. There is no separate native app in this repo. `app/manifest.ts` and `public/sw.js` make the site installable. The service worker caches icons and media. It does not cache the ledger or applications.

### NRI display currencies

Ledger rows and charges stay in INR. A landlord can set a **display** currency of INR, USD, CAD, or GBP (`/landlord/settings`). Conversion is a view, not a second ledger. The rate table is `DEMO_FX_PER_INR` in `lib/market.ts`, labeled `2026-09-01 (demo table)`. It is not a live FX feed.

### International OTP

Phone OTP accepts international E.164 numbers, not only +91. The picker includes India (+91), US / Canada (+1), UK (+44), UAE (+971), Singapore (+65), and Australia (+61). Send and verify stay on this machine. The demo code is shown on screen (`246810`). No SMS provider is called.

### Parked markets

The United States, Canada, Brazil, and the United Kingdom (`US`, `CA`, `BR`, `GB`) must not be seeded as live or demo markets. A Super Admin can start a **draft** country at `/cms/markets`. A draft stays off public forms until every checklist row is complete:

- currency (code, minor-unit exponent, locale grouping)
- address fields, order, and postal-code rule
- phone country code and example E.164 number
- ID document type (never Aadhaar outside India)
- tax and registration identifiers
- rent basis (per area per month, per area per year, or total)
- area display unit (square metres are still the stored unit)
- payment methods the landlord may offer

Each future market is meant to plug in through the same seams: currency, phone, address, ID document types, and payment methods. Completing the checklist is required before that country can appear on public forms.

## Roles and demo identities

**Real landlords** sign up with email/password at `/signup` (`is_demo=0`). Sessions use a signed cookie (`DESKULPT_SECRET_KEY`).

The header **Identity** control (`data-testid="demo-identity"`) appears only when the demo switcher is enabled (`DESKULPT_DEMO_SWITCHER=1`, or non-production by default). It lists **only** `is_demo=1` fixtures. Pick **Visitor · browse only** to clear the session. **Never enable the switcher on a production host that holds real data.**

One labelled demo landlord organisation: **DEMO · EasyRent Hyderabad** (`t_bbm`).

| Person | Id | Role | What to try |
| --- | --- | --- | --- |
| Avery Quinn | `u_avery` | Super Admin | CMS (demo platform org) |
| Chris Vogel | `u_chris` | Property Manager | Applicants with masked email |
| Jordan Blake | `u_jordan` | Merchandiser | Listing readiness only |
| Maya Chen | `u_maya` | Applicant | Apex Logistics. Submitted app for warehouse Unit B2. Demo KYC + OTP |
| Devon Hale | `u_devon` | Applicant | Northline. Approved on Unit A1. Demo rent/GST/late-fee ledger |
| Ravi Menon | `u_ravi` | Applicant | Residential applicant fixture |
| Nadia Okonkwo | `u_nadia` | Landlord admin | DEMO · EasyRent Hyderabad — warehouse, commercial, residential |
| Luis Ortega | `u_luis` | Electrician, Bhiwandi | Approved provider; weather-seal job |

Staff capabilities are in `lib/permissions.ts`. Real signup accounts never appear in the demo switcher and cannot read another organisation’s properties.

Seeded DEMO portfolio properties:

- **Demo Bhiwandi Hub** (warehouse)
- **Demo Forum Mall Storefronts** (commercial)
- **Demo Jubilee Hills Residences** (residential)

## Main surfaces

### Marketing home (`/`)

Brand-first landing page: large **Easy Rental.** mark, one headline, short lede, and CTA pair over a full-bleed blueprint grid. Portfolio stats and the leasing map sit below the first viewport. GSAP motion is on this page only (`components/marketing/motion.tsx`).

### Listings (`/listings`)

Filterable unit directory. Search text, landlord, area, status, square-foot range, rate range, minimum docks, minimum drive-ins, minimum clear height, power text, and whether the bay has a floor plan, a 360 photo, or a walkthrough URL. Sort by name, rate, or area.

### Portfolio and unit gallery

`/properties` lists buildings. `/properties/[slug]` is one building. `/properties/[slug]/units/[code]` is the bay.

Unit B1 at BBM Bhiwandi Hub is the rich media example. The gallery tabs are:

- **Stills:** dock, aisle, and yard photos under `public/media/`
- **GIF and video:** a motion loop and a short walk-through clip
- **360 photo:** an equirectangular image in [Pannellum](https://pannellum.org/) (MIT). Drag to look around
- **Walkthrough:** an interactive iframe. Easy Rental stores a Matterport show URL only (`units.matterport_url`). Seeded demos (PRD SaaS §4.6): B1 `PmWtWjyqpJs`, A2 `VpGQDT9DFjr`, C2 `caFmhpiUXSc`, H1 `7Fdpg6tCFwu`, U1 `U5p62iYcxeY` — all `https://my.matterport.com/show/?m=…`. No Matterport SDK or vendored assets. Other bays show an empty slot until a URL is set
- **Map:** Leaflet + OpenStreetMap pins from property `latitude` / `longitude`. Clicks open generic Google Maps URLs. No Mapbox key

### Floor plans

Seeded SVG plans live in `public/floorplans/`. A building page plots unit hotspots (available, offer pending, leased) and links through to the bay. Landlord admins upload a replacement plan and edit hotspot positions from the property page. Uploaded files stay on the machine running the server (`data/uploads/`).

### Applications

An applicant applies at `/apply/[unitId]` (company, contact, email, intended use, notes). Status is tracked at `/account`. Maya's B2 application starts as submitted. Devon's A1 application is already approved.

Nadia's inbox is `/landlord/applications`. Approving Maya is the path covered by `e2e/leasing-path.spec.ts`.

### Landlord desk (`/landlord`)

Requires a landlord admin. Demo: Nadia (DEMO · EasyRent Hyderabad). Real signups see only their organisation. Portal chrome uses a left accent rail and desk-scoped side nav.

- `/landlord` overview
- `/landlord/properties` and `/landlord/properties/[id]` buildings, floor plan, hotspots
- `/landlord/applications` inbox
- `/landlord/jobs` concierge board (open, assigned, accepted, complete)
- `/landlord/providers` approve a provider for this organisation
- `/landlord/ledger` organisation ledger
- `/landlord/settings` display currency, Razorpay shop keys (write-only secret)
- `/landlord/shop` SKUs and paid shop orders

### Occupant shop

`/shop` is for applicants with an **approved lease** (Devon on BBM Unit A1). Maya sees an empty “Shop is for current occupants” state. Seed SKUs: Extra Keys, FOB, Air Filters, Repair tool kit rental, Service Lift Booking. Cart + checkout use `demoShopPay` by default (`lib/shop-payments.ts`). Landlord **Settings → Payments → Razorpay** accepts Key ID / Secret; the secret is encrypted at rest and never returned on GET (last-4 only). Demo mode toggle forces the demo adapter even when keys exist. No live Razorpay HTTP charges in this build.

### Payments and ledger

`/account/payments` is the applicant ledger. Devon's BBM rows are INR: June rent and GST marked paid via the demo eNACH method, September rent plus GST still due, a late fee after the 5-day grace, and October rent and GST. Late-fee rules are per organisation (flat amount plus a percent of rent). The pay action calls `demoPayments` in `lib/payments.ts`, which returns a demo reference and writes a ledger line. It does not contact a bank or NPCI. The form keeps a last-4 only. It never asks for a full card or a full UPI secret.

`/landlord/ledger` is the same money from the landlord side.

### Verification (demo)

`/account/verify` is a labeled demo wizard. India uses a licensed KYC provider reference (no Aadhaar images). The score is simulated. The server keeps country, region, document type, and a provider reference — not document bytes or biometrics. A "match" is not an identity proof. Devon's seed row is a pre-baked match so the approved applicant has a verification on file.

### CMS

`/cms` is for platform staff only. Anyone else is asked to switch to an Easy Rental operator. Same desk chrome as the landlord portal.

| Path | Who | What |
| --- | --- | --- |
| `/cms/staff` | Super Admin | Easy Rental operators |
| `/cms/landlords` | Super Admin, Account Manager | Landlord organisations. Invite a demo landlord |
| `/cms/applicants` | Super Admin, Account Manager, Property Manager | Prospects and occupants. Property Manager email is masked |
| `/cms/providers` | Super Admin, Service Manager | Verify a provider, then approve them for a landlord |
| `/cms/listings` | Super Admin, Property Manager, Merchandiser | Listing readiness |
| `/cms/markets` | Super Admin | Live India plus the next-market checklist |
| `/cms/languages` | Super Admin | Add a language |

Adding a language stores the language and, when `GOOGLE_CLOUD_TRANSLATION_API_KEY` or `GOOGLE_TRANSLATE_API_KEY` is set, translates `locales/en.json` through the official Google Cloud Translation API (v2). With no key, the language is saved and translation waits. The app does not scrape Google and does not invent translated strings. Generated locale files other than `locales/en.json` are gitignored.

### Provider portal (`/provider`)

A service provider does not get a public job board. After platform verification and a landlord approval for their service area, the landlord assigns a job. Luis can accept or complete the Bhiwandi weather-seal job. Trades in the seed are electrician, plumber, courier, and cleaning.

### Inbox (`/inbox`)

In-app notices for the current identity: application received, late fee, job assigned, NRI display-currency reminder, and similar. Unread count shows in the header.

### PWA

Manifest name is Easy Rental. Display is `standalone`. Icons are `public/icons/icon-192.png` and `icon-512.png`. `components/pwa-register.tsx` registers `/sw.js` and shows an install button when the browser fires `beforeinstallprompt`.

### Legal and help

- `/legal/terms` — software, demo fixtures, organisation scoping, MIT / GSAP / Matterport
- `/legal/privacy` — storage, DPDP consent/export/erasure, no Aadhaar images
- `/help/landlord`, `/help/tenant`, `/help/faq` — in-app manuals (markdown mirrors under `/docs`)

### Developer docs

See [`docs/setup.md`](docs/setup.md), [`docs/architecture.md`](docs/architecture.md), and env checklist in `.env.example`. Health: `GET /api/health`. Hosting target: Railway (volume + `DESKULPT_SECRET_KEY`; not deployed from this PR).

## Stack and licensing

| Piece | In this repo |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Base UI, Lucide |
| Motion | GSAP on the marketing home |
| Validation | Zod |
| Data | SQLite through `node:sqlite` (`lib/db.ts`). Default file `data/deskulpt.sqlite` |
| 360 photos | Pannellum 2.5 |
| Tests | Vitest, Playwright |
| Runtime | Node.js 22 or newer |

**MIT.** See `LICENSE`. Copyright 2026 DeSkulpt contributors.

Open-source dependencies only, with one stated exception: **GSAP** is used under its no-fee standard licence for commercial and non-commercial use. It is not an OSI licence. Every other direct dependency is under an OSI licence. Pannellum is MIT. Matterport, if you paste a show URL, stays Matterport's service. This app only embeds an iframe.

No API key is required to run the demo. A Google Cloud Translation key is optional and only used when a Super Admin adds a language.

## Local run

```bash
git clone https://github.com/deskulpt/Property-Manager.git
cd Property-Manager
git checkout main
npm install
npm run dev
```

Open http://127.0.0.1:43123/

`npm run dev` is `next dev -H :: -p 43123`. The server binds dual-stack (`::`) on port **43123**. The first request creates `data/deskulpt.sqlite` and loads the demo portfolio. That file and `data/uploads/` are gitignored.

Restore the seed after you have changed local data:

```bash
npm run reset
```

`npm run reset` runs `test/reset-cli.test.ts`, which closes the local database handle in that process and rewrites the seed at `DESKULPT_DB_PATH` or `data/deskulpt.sqlite`. Stop `npm run dev` first so the running server is not holding the same SQLite file. The command prints `Seed restored at ...` when the seed version and Maya's user row are present.

Production-style commands, still on port 43123:

```bash
npm run build
npm start
```

## Rust core (WASM)

Pure-compute ledger math and unit packing live in `crates/easyrent-core`, exposed through `crates/easyrent-wasm` and prebuilt packages under `packages/easyrent-wasm/` (nodejs + bundler). TypeScript seams in `lib/format.ts`, `lib/market.ts`, and `lib/plan-draft.ts` are thin wrappers with a TS fallback when WASM is unavailable. Canonical PR: Origin [#15](https://cursor.com/codebase/deskulpt/Property-Manager/pull/15) (`cursor/rust-core-wasm`).

```bash
npm run test:rust      # cargo test --manifest-path crates/Cargo.toml
npm run build:wasm     # rebuild packages/easyrent-wasm (needs rustup + wasm-pack)
npm test               # includes test/rust-core-parity.test.ts
curl -s http://127.0.0.1:43123/api/core/health   # { backend: "wasm"|"fallback" }
```

Force the TypeScript fallback with `EASYRENT_FORCE_TS_CORE=1`. Install Rust if needed: `rustup` (stable), `rustup target add wasm32-unknown-unknown`, `cargo install wasm-pack`. Committed `.wasm` artifacts mean `npm test` / `npm run build` do not require `rustc`.

## Tests

```bash
npm test
npm run test  # isolation + shop + rust parity
```

- `npm test` runs Vitest suites including isolation, shop, segment expansion, listing import, plan-draft, and **rust-core-parity** (WASM vs prior TS). It checks tenant isolation, approving Maya (rent plus GST, and a second approve fails), late-fee idempotence, CMS email redaction, provider area approval, and that public form countries stay India-only until a draft checklist is complete. It does not use `data/deskulpt.sqlite`.
- `npm run test:watch` runs the same files under Vitest watch.
- `npm run test:e2e` runs Playwright (`e2e/leasing-path.spec.ts`) against its own Next process on **port 43124** and a throwaway database. It does not reuse the dev server on 43123. The script loads the home page, switches to Nadia, approves Maya's application, and confirms Maya sees approved status and an INR rent row.
- `npm run lint` runs ESLint.

Playwright downloads a browser on first use (`npx playwright install` if the run asks for one).

## Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request and every push to `main`:

1. `npm ci` (Node 22, npm cache)
2. `npm run lint`
3. `npm test` (Vitest isolation suite)
4. `npm run build`

An optional **Deploy** job on `main` and a manual **Deploy (manual)** workflow (`workflow_dispatch`) call Vercel only when `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are set as repository secrets. Without those secrets the job skips — no fake credentials. Railway (or another host for easyrental.space) can follow the same pattern later. Playwright e2e is a separate workflow when present; it is not required for this CI gate.

## Demo limits

These boundaries are intentional:

- **No live KYC.** Verification never calls UIDAI or any other government API and does not store a biometric template.
- **No live charges.** UPI and eNACH go through the demo adapter. No bank, NPCI, or card network is contacted. A ledger line marked paid is a local row.
- **Email, web push, and WhatsApp are demo.** `lib/notifications.ts` writes inbox rows on channels `in_app`, `email_demo`, `push_demo`, and `whatsapp_demo`. Nothing is sent to a mailbox, a push service, or WhatsApp.
- **OTP is local.** The code is displayed in the app. There is no SMS provider.
- **FX is a labeled table in code**, dated 2026-09-01 in the source, not a live FX API.
- **Do not upload a real Aadhaar, passport, driving licence, or payment card.** Identities are fixtures on the `.example` domain.
- Late fees, occupancy, and verification scores illustrate the workflow. They are not advice on a real lease.

## Branches

| Branch | What it is |
| --- | --- |
| `main` | **Product default.** Full India desk, acceptance tests, and the blueprint-paper UI/UX rework. |
| `cursor/ui-ux-rework` | UI/UX rework branch (merged into `main`). |
| `cursor/e2e-acceptance-38da` | Acceptance slice before the UI rework (seed reset, isolation tests, Playwright leasing path). |
| `feature/property-saas` | Earlier product line without the acceptance/UI follow-ons. |

Remote: `https://github.com/deskulpt/Property-Manager.git`

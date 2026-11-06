# Easy Rental — Product requirements (scope + delivery)

**Product:** Easy Rental · easyrental.space · a product of DeSkulpt Inc.  
**Canonical product spec:** [prd-unified-v1.md](./prd-unified-v1.md) (**APPROVED** 6 Nov 2026) · decisions [prd-decisions-d01-d15.md](./prd-decisions-d01-d15.md) · checklist [prd-unified-approval-checklist.md](./prd-unified-approval-checklist.md)  
**Repo tip baseline:** Origin `7808188` / GH `5ca1b25` (Ask Easy island); D01+D02 reconcile on this branch  
**Date:** 6 Nov 2026  

This file is the **in-repo delivery-status companion**. Prefer the **approved unified PRD** for product requirements. Prefer tip code over aspirational copy for “shipped” claims.

---

## 1. Vision (locked)

Hosted multi-tenant leasing desk for industrial / commercial (and multi-segment) landlords: self-serve org → paid subscription → inventory + interactive building → applications → lease / eSign → occupant portal → provider jobs. Seekers browse and apply **free** (**No Broker!**). Primary revenue = **landlord/org subscription** (+ services / partner network).

**Primary USP:** PWA-friendly **3D building/unit visualizer** + **CAD/PDF floor ingest** (walls / units / doors / stairs — not furniture/MEP spam).

**UI target (prefs):** DaisyUI + Tailwind semantic desks, PWA-first mobile, brand navy `#13253a` / cyan `#0e6e8c` / steel gold `#8f6f1f` — not generic AI purple/cream.

---

## 2. Role ladder

| Level | Role | Desk |
| --- | --- | --- |
| L0 | SuperAdmin | `/console` |
| L1 | DeSkulpt Admin / CMS staff | `/console` · `/cms` |
| L2 | Landlord Account | `/landlord` (after `/pricing/subscribe`) |
| L3 | Property Manager (Managing agent) | `/agent` |
| L4 | Lease Applicant (+ occupant) | `/applicant` · `/account` · `/portal` |
| L5 | Service Provider | `/provider` |

Sticky impersonation: **L0–L1 only**. Self-serve onboarding: **L2–L5**.

---

## 3. Scoped features — delivery status vs tip

Status: **shipped** · **partial** · **not delivered**.

| Scoped feature | Status | Tip reality | Gap |
| --- | --- | --- | --- |
| **DaisyUI PWA** | **partial / tip** | DaisyUI desks + PWA on tip (D14 keep); residual shadcn primitives | Finish residual chrome migration; not a security claim |
| **Full role funnels** | **partial** | L0–L5 desks + public acquisition routes; demo money loops work | Hard delete missing; some reject/notice verbs dead; DaisyUI purpose UX pending |
| **Listings CRUD + delete** | **partial** | Create / edit / publish / hide / soft delist shipped (L2+L3) | **Hard Delete** unit/property **not delivered** |
| **Claude Design main site** | **not delivered** | `/`, `/listings`, `/pricing` exist on prior craft | Brand-first Claude Design / DaisyUI marketing composition not on tip |
| **Multi-country money schema** | **partial** | `CountryPack` schema + promote/demote on tip (`lib/markets/*`); IN live; CA pack ready path | Public CA shard / inventory still parked; live MoR keys go-live |
| **L0 command center** | **shipped** | Real `/console` ops: markets promote, billing, flags, identity, eSign, listings, Ask Easy, partners/referrals | Org hard-erasure still support-only; live vendor keys go-live |
| **3D CAD visualizer USP** | **shipped** | CAD/PDF vector ingest + PlanDraft extrude viewer (`draft-building-viewer`) + prior floor stack/Matterport | Native DWG convert + live LLM segment still follow-ups |
| **Subscription monetization** | **partial** | `/pricing` · subscribe · demo activate · billing desk | Live Razorpay/Stripe/PayPal charge **not delivered** |
| **Ask Easy** | **partial** | Desk + approval queue + lease onboard + stub model | Live LLM soft; public `/ask` retrieval-only |
| **eSign** | **partial** | Demo + Digio/eMudhra adapter shapes; approve-before-send | Live transport + production keys gated |
| **MCP** | **partial** | M0 read-only + M1 propose/approvals on tip | Prod OAuth / PAT **not delivered** (`demo:` stub) |

---

## 4. Listing lifecycle (required)

```
create property → create/edit unit → publish (listed=1)
  → public apply/visit → approve → lease + ledger
  → soft delist (hide / hold) → hard delete (required; missing on tip)
```

| Verb | Tip |
| --- | --- |
| Create / Read / Update / Publish / Hide / Soft delist | **shipped** |
| Hard delete unit or building | **not delivered** |

---

## 5. Business model (D01 / D11 / D12 / D13)

1. Charge landlords **per billable unit / month** (Homes / Retail & Office / Industrial) via `lib/billing/pricing.ts`. Free = 1 unit. Volume 6–20 15%, 21–50 25%; **>50 = enterprise quote**. India GST 18% adapter. Packages Free/Growth/Pro/Enterprise gate **entitlements** (D02), not a second money meter.  
2. Seekers: free browse / apply / visit (**No Broker!**).  
3. Adjacent: Refer & Earn (demo), Partner & Service Network, occupant shop — **no rent skim**.  
4. Partner **20% SaaS affiliate** stays **documented, not activated** (D12).  
5. **India live**; Canada parked pending L0 CountryPack checklist (D13).

---

## 6. Definition of done (near-term product bar)

A slice is **done** only when tip shows UI + server action + test for that verb, or an explicit **not delivered** label remains in §3.

**Must close before claiming “complete SaaS desks”:**

1. DaisyUI + PWA desk shell for every role (prefs UI stack).  
2. Listings **hard delete** (compliance / mistaken create).  
3. Claude Design marketing first viewport (brand-first, real CTAs).  
4. Live public multi-country inventory (CA/US) after pack promote + legal — schema packs already on tip.  
5. Live subscription MoR + live eSign + prod MCP auth for monetized launch.  
6. Native DWG convert + optional LLM floor segment (3D USP deepen).

Demo adapters are allowed on OSS/local if labelled; they do **not** flip status to **shipped** for live-vendor claims.

---

## 7. Related documents

### In this repo

- [prd-unified-v1.md](./prd-unified-v1.md) · [prd-decisions-d01-d15.md](./prd-decisions-d01-d15.md) · [prd-unified-approval-checklist.md](./prd-unified-approval-checklist.md)  
- [business-model-money.md](./business-model-money.md) · [launch-readiness-review.md](./launch-readiness-review.md)  
- [architecture.md](./architecture.md) · [setup.md](./setup.md) · [seed-3d-models.md](./seed-3d-models.md)

### Project store (IA + full PRD)

Absolute paths on agent hosts under  
`/cursor/stores/bc-a65bf168-6bf0-4836-95df-fe3076b1c938/docs/`:

- `full-funnel-ia.md` — role pages, CTAs, listing lifecycle  
- `role-feature-completeness.md` — complete / partial / dead checklist  
- `prd-saas-multitenant.md` — full SaaS PRD + §22 delivery appendix  
- `prd-scope-gap-oct31.md` — canonical Oct 31 honesty matrix  
- `cad-pdf-floor-ingest.md` · `usp-competitive-listings-in-ca-us.md` — CAD + USP  
- `main-site-claude-design.md` · `go-live-dependencies.md` — marketing brief + vendor keys

---

## 8. Non-goals (still true)

- Live UIDAI / government ID APIs.  
- Seeking monetization via contact packs.  
- AGPL viewers (xeokit) in the product tree.  
- Silent Ask Easy / MCP mutations (never-auto).  
- Treating demo billing, demo eSign, or stub LLM as production.

---

*Update §3 when tip moves. Re-verify DaisyUI dependency and hard Delete first.*

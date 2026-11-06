# Easy Rental — Unified Product Requirements Document

Version: 1.1 approved  
Date: 6 November 2026  
Product: Easy Rental / DeSkulpt Inc.  
Repository: https://github.com/deskulpt/Property-Manager  
Document owner: Product owner; engineering, security, finance and legal jointly approve their sections.  
Status: **APPROVED** canonical specification (D01–D15 owner sign-off). Not an assertion that every requirement is implemented. See [`prd-decisions-d01-d15.md`](./prd-decisions-d01-d15.md).

## 0. Document authority, evidence and corrections

This single document replaces the fragmented specifications generated in this conversation as a proposed future product specification. Preserve those files only as historical inputs. Do not ask implementation agents to follow multiple competing files.

It does not automatically replace approved repository requirements, pricing contracts, legal terms, or existing customer entitlements. On approval, reconcile this document with `docs/prd.md`, `docs/business-model-money.md`, `docs/architecture.md`, and the implementation backlog in one reviewed change.

### 0.1 Evidence boundary

The most recent repository reads in this conversation identified GitHub commit `4bb9d42234204ba70a4e02b656f060e68ccb7b49`, whose message says it mirrors origin `b9f49d7`. Directly inspected files included `docs/prd.md`, `docs/business-model-money.md`, `docs/launch-readiness-review.md`, `lib/billing/pricing.ts`, `lib/plans.ts`, `lib/permissions.ts`, and `lib/mcp/policy.ts`. Earlier README and architecture reads also informed this document.

This was a targeted source review, not a complete code audit, test execution, penetration test, deployed-system inspection, or dependency audit. Historical security review entries are reported findings, not newly verified fixes. Repository status must be rechecked at implementation kickoff against a pinned commit.

Evidence labels used below:

- OBSERVED: directly present in inspected source or configuration.
- DOCUMENTED: claimed by repository documents; still needs code and runtime verification.
- PROPOSED: a requirement or design recommendation, not current behavior.
- DECISION: owner approval required before implementation or public pricing.

### 0.2 Corrections to earlier advice

1. The product scope is multi-segment. Do not reduce it to warehouses or one city without an explicit commercial decision.
2. Existing code or docs do not prove production readiness. Adapter interfaces, demo payments and seed data are not live integrations.
3. A free-seeker positioning does not prohibit optional product purchases, but application access, owner contact and mandatory verification must not become hidden seeker paywalls.
4. Service commissions, lawful product margins and disclosed affiliate rewards are proposals, not existing commercial terms. A blanket rent percentage is not approved.
5. Ask Easy feature flags are not proof that external MCP access has the same gate. Define and test each entitlement explicitly.
6. Do not assume Grok Bot, Muse or Dots support any particular MCP transport, OAuth flow, plugin mechanism or approval UI. Validate their current official capabilities and account availability before naming them supported.
7. Do not mint arbitrary five-minute tokens for external vendors unless those vendors support them. Use each provider's documented credential model, vault storage, least privilege and supported token exchange. Never pass an Easy Rental MCP token to a downstream vendor.
8. Signed standing authorization can permit routine cleaning dispatch and notifications. This requires an approved policy revision to the current never-auto implementation, not a silent bypass.
9. An approver must be an authenticated authorized human, not a model or service identity. They may be the same human who originally asked their assistant for the task. Require a second independent human only for designated separation-of-duties actions.
10. A fixed floor-plan or Matterport requirement must not prevent a valid residential listing unnecessarily. Publication readiness is configurable by profile and customer policy.
11. Pricing-code behavior and proposed public cards remain inconsistent. This document records that conflict; it does not treat implementation as commercial sign-off.
12. Broad architectural support is not a claim that hotels, hospitals, factories or every specialist regulated facility have complete workflows. Publish a profile support matrix.

---

## 1. Executive product definition

Easy Rental is a multi-tenant property operations and leasing platform spanning residential, office, retail, industrial, warehouse, storage and mixed-use portfolios. Its differentiator is the combination of spatial inventory, direct leasing, governed automation and agent interoperability.

The web/PWA interface is one client. A landlord, property manager, applicant, occupant or service provider may use an existing conversational assistant or messaging channel to perform supported tasks through the same domain services and policy controls.

The platform owns authoritative records, authorization, contracts, workflow state, scheduling, approvals, money references and audit. External AI hosts own their conversation experience. They never acquire unrestricted authority over the platform.

### 1.1 Product pillars

P1. Spatial inventory: building/floor/unit hierarchy, plans, CAD/PDF-assisted ingest, media, maps, Matterport links and accurate availability.  
P2. Direct leasing: discovery, visits, applications, offers, agreements, occupancy and exit without seeker contact paywalls.  
P3. Operational autopilot: standing agreements and policies produce reliable work orders, reminders and replenishment without prompting a person every time.  
P4. Bring your own assistant: versioned APIs and MCP expose the same authorized operations to existing hosts.  
P5. Commerce and ecosystem: optional services, partner referrals, procurement, landlord stock and later managed hardware.  
P6. Enterprise trust: strong tenancy, delegated management, finance controls, audit, recovery and explicit autonomy limits.

### 1.2 Core product promise

“Your property portfolio, leasing desk and operating agreements — accessible from the interface or assistant you already use, with routine work handled automatically and exceptions brought to you.”

### 1.3 What the platform is not

Not a replacement for licensed legal, engineering, fire-safety, brokerage, insurance or emergency professionals. Not a general autonomous money-moving agent. Not a requirement to buy house-brand products or use only platform-selected vendors. Not a new consumer chatbot app as the primary business.

---

## 2. Scope and property profiles

### 2.1 Shared inventory model

Organization → portfolio → site/property → building → floor → rentable space/unit.

Support outdoor rentable space without forcing fictional buildings/floors. A unit may attach directly to a property. Record physical assets independently from rentable units. Separate property classification from unit use and from billing category.

| Profile | Specialized attributes | Specialized operating workflows | Initial support expectation |
|---|---|---|---|
| Residential | Bedrooms, furnishing, occupancy limits, utilities, deposit | Move-in/out, repairs, inspection, receipts | Full shared leasing + residential rules |
| Office | Usable/chargeable area, fit-out, power, parking | Fit-out approvals, access, shared charges | Full shared leasing + office rules |
| Retail | Frontage, signage, permitted use, opening restrictions | Signage, fit-out, handover, service charges | Shared leasing + retail rules |
| Warehouse/industrial | Docks, clear height, loads, power, access, yard | Turnover, capture, equipment maintenance | Shared leasing + industrial rules |
| Storage/yard | Indoor/outdoor, access hours, security, surface | Access, clearance, recurring inspection | Shared leasing + storage rules |
| Mixed-use | Combination of unit profiles | Shared assets and apportioned charges | Composition of supported profiles |
| Hospitality, medical, highly regulated specialty | Specialized operational requirements | Reservations, clinical, regulated operations | Discovery/inventory only until dedicated packs approved |

Each profile specifies required attributes, validation, media requirements, lease templates, taxes, recurrence rules and compliance reminders. Segment-specific code belongs in profile modules, not repeated apps.

### 2.2 Countries and jurisdictions

Keep existing India capability and country-pack direction. Treat a market as country + relevant state/province/local rules, not a currency selector alone. Enable a new live jurisdiction only after payment, tax, privacy, agreements, document, support and operational checklist approval.

Store monetary amounts with ISO currency and minor-unit exponent; do not globally hard-code all currencies to two decimals. Existing INR platform quote logic remains an India-specific adapter. Rent ledgers, platform subscriptions, supplier invoices and display FX are distinct contexts.

---

## 3. Personas, organizations and entitlements

### 3.1 Actors

- Platform super administrator; scoped platform operations, finance, compliance and support staff.
- Landlord owner and organization administrator.
- Property management company administrator; portfolio manager; property manager.
- Leasing, accounting, maintenance, administrative and customer-support staff.
- Applicant individual or applicant company with multiple representatives.
- Occupant, co-occupant, guarantor and authorized company contact.
- Provider business owner, dispatcher, technician, photographer, cleaner and specialist contractor.
- Partner: developer, broker, agent, architect, contractor, reseller or affiliate.
- OAuth client, external agent session, first-party assistant and background worker.

### 3.2 Organization model

A user is global and may have many memberships. A property management company may manage multiple landlord organizations through explicit management agreements/delegations. It must not silently merge their financial records.

A landlord may own several properties and invite a management firm without transferring ownership. Record owner, operator, manager and beneficiary as separate relationships. A provider organization may work for many landlords while receiving only assigned work-order data.

### 3.3 Authorization

Combine RBAC (what a role can do), ABAC (resource state, risk, data sensitivity) and relationship scope (which organizations, portfolios, properties, units or jobs).

Interface: `authorize(principal, action, resource, execution_context) -> ALLOW | REQUIRE_APPROVAL | DENY`, with machine-readable reason and obligations such as field masking.

Evaluate authentication → active membership/delegation → role → tenant/property scope → resource state → sensitivity → entitlements → risk/standing authority → audit obligations.

No rank-based shortcut: L0–L5 are product navigation/persona labels, not numeric privilege comparisons. Resolve existing platform and landlord property-manager roles explicitly to avoid name collision.

### 3.4 Example access matrix

| Actor | Allowed | Restricted |
|---|---|---|
| Landlord owner | Own portfolio, sign policies, authorize budget | No other owner's data |
| Property manager | Assigned properties under active delegation | No unassigned portfolio, restricted financial actions |
| Admin staff | Invites, scheduling, routine admin if granted | No self-escalation, no payout details by default |
| Accountant | Finance, reconciliation, authorized exports | No application decision unless separately granted |
| Support staff | Case-scoped, masked records | No bulk PII, hidden impersonation, credentials |
| Applicant/occupant | Own application, lease, requests, purchases | No other applicant or occupant information |
| Provider | Assigned jobs, minimum access/contact data | No applications, rent ledger or unrelated jobs |
| Partner | Attributed conversions and earned commission | No applicant lists or landlord financial records |
| External assistant | Intersection of user rights, grant scopes and policy | Cannot exceed the human's rights |

### 3.5 Entitlements

OBSERVED: `lib/plans.ts` currently enables `askEasy` for Pro/Enterprise, not Free/Growth. The public cards and runtime limits disagree. PROPOSED: separate entitlements for `assistant.read`, `assistant.draft`, `assistant.propose`, `automation.policies`, `api.access`, `mcp.access`, seats, media/storage and workflows. Decide package mapping before launch. Security, tenant isolation and required audit controls are never paid-only features.

---

## 4. Required end-to-end product journeys

### 4.1 Owner and manager onboarding

Create organization → choose jurisdiction → owner identity → invite staff or authorize a manager → establish subscription and entitlements → import/create properties → configure profile and publication policy → onboard vendors → sign first operating policy → preview upcoming work.

CSV import supports validation, duplicates, partial failures and rollback preview. Spatial import must show confidence and require confirmation before updating rentable boundaries.

### 4.2 Leasing and occupancy

Create property/unit → validate facts/media → publish → inquiry/visit → application → review → offer/lease draft → human decision/signature → active lease → handover → operations → renewal/notice → possession returned → turnover → relist.

Application approval does not itself prove an executed lease or authorize entry. Shop access and occupancy rights must be derived from the configured effective lease/occupancy rule, not just `application.status = approved`.

### 4.3 Everyday operations

Occupant reports issue by chat, voice, image or UI → identify authorized unit → safety triage → classify → retrieve agreement → estimate/quote → dispatch or seek exception → appointment → status tracking → completion evidence → verification → invoice matching → authorized settlement.

### 4.4 Enterprise experience

Portfolio health and exception inbox; pending approvals; calendar; spatial readiness; expiring agreements; vendor SLAs; billing; audit timeline. Every supported conversational action returns a durable reference and viewable record. Users can switch from a bot to the web without losing workflow state.

---

## 5. Automation intelligence: rules, agreements and evidence

### 5.1 Separation of responsibilities

The model interprets intent, extracts structured facts, drafts content, summarizes evidence and suggests a plan. Deterministic services calculate prices, authorize changes, evaluate agreement clauses, validate transitions, schedule timers and commit effects.

Forecasting may propose earlier preparation; it must not transform predicted vacancy into legal possession or permission to enter. An LLM confidence score is not authorization.

### 5.2 Autonomy levels

A0 Observe: authorized reads and suggestions.  
A1 Draft: unpublished records, reversible notes and plans.  
A2 Confirm per action: bind an exact proposal to a human approval.  
A3 Standing authorization: auto-execute an exact class of routine work within a signed, versioned policy, active vendor agreement, budget and access rules.  
A4 Restricted specialist actions: unavailable or separate dual-control workflows (e.g., legal notices, privileged export, large refunds, safety override).

A3 is the target for routine orders. The inspected `lib/mcp/policy.ts` currently blocks silent money, lease-send, notify, publish, export and assignment actions. Launch A2 first or introduce A3 through an explicit approved policy change plus migration and tests. Existing never-auto checks remain fail-closed during migration.

### 5.3 Authorization distinctions

A signed vendor contract sets commercial terms. A signed landlord automation policy grants execution authority. An access authorization permits entry or credential issuance. A budget reservation proves available spend. None substitutes for another.

A routine purchase order may be authorized without authorizing automatic invoice payment. Invoice payment requires a separate approved mandate and matching checks.

### 5.4 Policy definition

A policy records: organization, scope, trigger, authoritative dates, conditions, vendor strategy, service/rate-card revision, schedule window, entry conditions, order cap, rolling budget, tax treatment, maximum retries, expiry, allowed notifications, approvers, cancellation rules and escalation path.

Natural language → structured draft → preview examples and costs → human review → signed version → active. Policies never self-expand after a model conversation. Revocation stops future work; in-flight contractual liabilities require an explicit cancel/compensate process.

### 5.5 Policy example

```yaml
key: turnover.standard_clean
version: 1
scope:
  profile: [residential, office, retail, warehouse, storage]
trigger: lease.vacancy_forecast_updated
prepare:
  offset_days: -7
  allowed_effect: tentative_slot_hold
commit:
  requires:
    - move_out_confirmed
    - vendor_agreement_active
    - service_rate_available
    - provider_credentials_valid
    - site_access_authorized
  service_code: standard_turnover_clean
  max_order_minor: 1200000
  currency: INR
  monthly_budget_minor: 10000000
  execution: standing_authorization
entry:
  earliest: possession.returned
notifications:
  templates: [vendor_order, occupant_appointment, owner_summary]
exceptions:
  quote_exceeded: human_approval
  vendor_unavailable: approved_alternative_or_escalate
  lease_renewed: cancel_or_replan
payment:
  auto_pay: false
```

Amounts are illustrative, not approved commercial pricing.

---

## 6. Flagship automation playbooks

### 6.1 Pre-vacancy and turnover cleaning

- Trigger on confirmed notice, move-out change, or scheduled review before lease end.
- Verify renewal/extension status. Lease end alone does not mean the occupant has left.
- Reserve a tentative cleaning slot before departure where the vendor permits no-cost or authorized cancellation.
- Commit the order only when agreement, budget and execution conditions match.
- Perform entry only after possession/access authorization or lawful occupied-premises appointment consent.
- Sequence exit inspection → repairs → cleaning → media if dirty work affects presentation.
- Require a change order for damage/specialist scope above the standard rate.
- If the lease renews, move-out shifts or holdover occurs, cancel or replan downstream work and disclose cancellation fees.
- No duplicate job when notice, timer and manual chat all reference the same turnover cycle.
- Completion evidence and occupant/manager verification precede invoice matching.

### 6.2 Property allotment, photographer, 360 and video

New property allocation/import → assess profile-specific listing readiness → locate active photographer/capture agreement → verify access, location, coverage and budget → book slot → issue brief → track uploads → verify deliverables → approve media → publish if separately authorized.

Separate stills, video, floor measurement and Matterport deliverables. Store rights, license, capture date and accessibility alternatives. Reuse licensed media when still accurate; do not repeatedly commission a shoot on every edit. Matterport integration may remain a validated show URL; API/SDK use requires separately verified access and terms.

### 6.3 Recurring and event-driven maintenance

Asset schedule or occupant report → warranty/AMC check → classify → contracted dispatch → follow-up → evidence → invoice. Emergency hazards surface local emergency guidance and human escalation immediately; do not wait for a model, vendor quote or budget approval to show safety instructions. The system cannot certify a building safe.

### 6.4 Rent and accounts

Approved lease schedule → draft invoice/charge calculation → authorized release → reminder templates → provider settlement webhook → reconciliation → receipt. Deterministic late-fee rules run once per period and must be reviewed for jurisdiction/lease applicability. Never mark “paid” from an unverified screenshot or assistant message.

### 6.5 Renewal and vacancy planning

Review date → outreach under consent → draft renewal options → human commercial/legal decision → signatures → effective renewal event → suppress incompatible turnover orders. Pricing suggestions are advisory, explainable and never a hidden automatic rent increase.

### 6.6 Procurement, stock and access

Below-par stock → approved supplier/offer → budget → order → receiving → inventory → issue/return. A work order may issue a temporary contractor access credential only if a supported access integration and explicit access policy exist; credential expiry/revocation is deterministic. Never automatically lock out an occupant due to overdue rent or disputed tenancy status.

---

## 7. Use-case catalog and delivery bands

Bands: L = commercial launch core; A = launch automation pack (required to advertise autonomous operations); E = enterprise expansion; X = regulated/physical-product expansion with independent release gates.

| ID | Workflow | Band | Automation boundary |
|---|---|---|---|
| UC01 | Org signup, seats, manager delegation | L | Human ownership/privilege confirmation |
| UC02 | Property/unit import and profile validation | L | Confirm uncertain imports |
| UC03 | CAD/PDF-assisted plan and unit mapping | L | Human verifies inferred boundaries |
| UC04 | Listing readiness, publication and delisting | L | A2; optional authorized A3 later |
| UC05 | Inquiry replies and visit scheduling | L | Approved facts/templates, consent |
| UC06 | Applicant intake and missing-document chase | L | No autonomous consequential selection |
| UC07 | Screening-provider handoff | E | Licensed provider; no raw sensitive docs in models |
| UC08 | Offers, lease packets and e-sign | L/E | Live signature required if advertised |
| UC09 | Handover, meter readings and move-in checklist | A | Evidence, authorized access |
| UC10 | Rent schedules, ledger, receipts | L | Demo versus live clearly separated |
| UC11 | Live collections and reconciliation | E | Provider and finance gate |
| UC12 | Renewal/notice and exit coordination | A | Legal/commercial decisions human |
| UC13 | Pre-vacancy cleaning reservation/order | A | Standing authority + possession checks |
| UC14 | Repairs, pest and make-ready sequence | A | Dependencies, scope/cap checks |
| UC15 | Photographer, Matterport and video assignment | A | Agreement, media rights, quality gate |
| UC16 | Incident reporting and emergency escalation | L | No autonomous safety certification |
| UC17 | Standard maintenance and vendor SLA chase | A | Qualified vendor + budget |
| UC18 | AMC, inspection and credential expiry | A | Renewal reminders not legal certificates |
| UC19 | Occupant shop and landlord procurement | E | Optional goods, transparent seller |
| UC20 | Site stock, consignment and replenishment | E | Stock ledger, receiving, ownership |
| UC21 | Partner referrals and earned payouts | E | Attribution, refunds, tax, licensing |
| UC22 | Access control, FOB lifecycle, device health | X | Safety, privacy, offline/manual recovery |
| UC23 | Fire audit/drill/service coordination | X | Qualified firm issues findings/certificates |
| UC24 | Equipment rental/lease and replacement | X | Inspection, liability, warranty |
| UC25 | Owner statements and shared-charge allocation | E | Approved finance rules and reconciliation |
| UC26 | Procurement RFQ and contractor bid comparison | E | Disclosed ranking, human award where needed |
| UC27 | Support case and time-boxed support access | L/E | Case scope, audit, revocation |
| UC28 | Portfolio forecasts and optimization | E | Explainable advice, not guaranteed outcomes |
| UC29 | Country-pack activation | E | Jurisdiction checklist, legal and tax approval |
| UC30 | Data subject access, export and retention | L | Identity verification, retention exceptions |

---

## 8. Conversational channels and MCP interoperability

### 8.1 Channel-neutral operation

Implement APIs/commands once, then adapt web, PWA, email, messaging, voice and MCP. Do not automate the web UI as the normal integration path. Confirm identity before discussing private records; phone number matching alone is insufficient proof of account ownership.

Voice transcripts and forwarded emails are untrusted inputs. Critical dates, unit selection and spending changes require structured confirmation. Support accessible deep links or hosted forms for payment, identity and signature; “UI optional” does not mean bypassing provider-required consent surfaces.

### 8.2 Integration verification matrix

| Client category | Proposed integration | Release requirement |
|---|---|---|
| Claude/Cursor/other MCP hosts | Remote MCP | Official current transport/auth support and passed sandbox tests |
| Grok Bot | Remote MCP or supported adapter | Verify exact product, account access and supported mechanism |
| Muse | MCP/API/app if supported | Verify vendor identity, permissions and consent UX |
| Dots | Supported ChatGPT app/plugin/connector if available | Verify current official integration model; no assumed custom MCP |
| WhatsApp | Approved business messaging integration | Account, templates, consent, delivery/status webhooks |
| Email | Transactional provider + inbound verification | Anti-spoofing, link confirmation, reply authorization |
| Provider systems | Native API/webhook or connector | Contract, scopes, credential handling, retry behavior |

“Supported” means tested onboarding, read, propose, approval handoff, expiry, revocation and error recovery for a named client version/account type. If a host lacks embedded approvals, return a secure approval link.

### 8.3 MCP security and protocol

Use the current stable official MCP specification at implementation time. Pin SDK/protocol versions and keep a compatibility test matrix. Prefer supported remote HTTP transport, OAuth authorization with discovery and audience/resource validation. PATs may be an explicitly scoped fallback for suitable clients, not advertised as universal interoperability.

Validate issuer, audience, expiry, granted scopes and revocation. Resolve tenant from the server-side grant/context. A model can select an organization only among verified active memberships. Never trust an arbitrary tenant field.

No token passthrough. Protect connector credentials in a vault. Outbound tools require SSRF protection and endpoint allowlists; do not let an agent add arbitrary remote MCP servers to a trusted runtime.

### 8.4 Tool contract

Each registry entry declares name, version, strict schema, resource type, required scopes, policy action, risk, side effects, idempotency strategy, output masking, timeout, approval mode and supported standing-policy conditions.

Initial tools:

- `portfolio.search`, `units.read`, `listings.readiness`.
- `applications.list_own_or_scoped`, `visits.propose_schedule`.
- `listings.draft`, `listings.propose_publish`.
- `agreements.read`, `automation.preview`, `automation.propose_policy`.
- `work_orders.propose`, `work_orders.status`, `work_orders.reschedule`.
- `media.propose_assignment`, `media.submit_deliverable`.
- `billing.explain`, `approvals.read`, `approvals.submit_decision`.

Do not expose unrestricted SQL, arbitrary URLs, credential retrieval, generic code execution or an unconstrained “do anything” tool. Tool annotations are hints, never security enforcement.

### 8.5 Agent harness

Allowlisted tools → schema validation → policy evaluation → tenant-scoped service → result filtering → audit. Keep prompt and tool versions. Separate external document text from instructions. Treat vendor emails, PDFs, web content, tool outputs and memory as untrusted data.

Memory is scoped, consent-aware, classified, expiring and deletable. Store preferences and approved operational notes, not full identity documents, payment credentials or unsupported claims. Retrieved claims include record references, freshness and uncertainty.

Long operations return a durable job/run ID and status endpoint. Protocol task features are optional and client-dependent; correctness must not depend on a specific MCP task extension.

---

## 9. Architecture and execution reliability

### 9.1 Modular monolith first

Retain Next.js and existing working code where safe. Introduce module boundaries incrementally; a physical monorepo rewrite is not a prerequisite.

Modules: identity/tenancy; property/spatial; leasing/occupancy; agreements/vendors; work orders/scheduling; billing/rent accounting; commerce/inventory; partners; automation/approvals; communications; country packs; audit/observability.

### 9.2 Database and storage

PROPOSED production target: Postgres with migrations, constraints, connection pooling, backups and tested restores. Optional RLS is defense in depth, not a replacement for application policy. Secure object storage uses tenant-scoped metadata, signed short-lived access, malware scanning, content-type checks, retention and license records.

SQLite can remain local/demo. A deliberately accepted single-instance paid pilot requires explicit risk acceptance, backup testing and load limits. Do not label that HA enterprise infrastructure.

### 9.3 Durable workflows

Choose one mature workflow mechanism after a short technical spike: a durable workflow engine, or an existing queue plus persistent run/step/timer tables. Do not build multiple orchestration frameworks.

Use transactional outbox, inbox/webhook deduplication, at-least-once delivery, idempotent effects and provider reconciliation. Do not claim exactly-once external side effects. Persist timer state so restarts do not forget a lease end. Use bounded exponential retries, dead-letter queues and human recovery.

Reserve budgets transactionally before placing orders. Release reservations on verified cancellation. Use optimistic versions or locks on scheduling and approval resolution. Record timezone and UTC execution time; test DST and date changes.

### 9.4 Event envelope

`event_id, event_type, schema_version, organization_id, aggregate_type, aggregate_id, aggregate_version, occurred_at, correlation_id, causation_id, actor, payload`.

Events: property.created; unit.assigned; listing.readiness_changed; application.submitted; lease.executed; lease.notice_confirmed; lease.renewed; vacancy.forecast_changed; possession.returned; agreement.expiring; provider.credential_expired; order.requested; work_order.accepted/blocked/completed; media.delivered; invoice.matched; payment.settled; inventory.below_par; policy.revoked.

---

## 10. ERD: enterprise target model

This is a target, not an instruction to create every table before the first release. Add tables by release band and migrate existing equivalents instead of duplicating them. `organization` below corresponds to the SaaS tenancy boundary; an occupant is not called a SaaS tenant in code.

### 10.1 Common schema contract

Business records use stable opaque IDs, organization scope where owned, timestamps, row version and explicit status. Organization-scoped relations use composite unique/FK constraints where appropriate to prevent cross-organization references. Shared provider catalog entities expose controlled projections, not unrestricted landlord data.

Store money as integer minor amounts plus currency, percentage as basis points, quantities as exact decimal and dates/times with clear semantics. Financial and audit records are append-only or corrected with reversals. Soft deletion is not a substitute for retention/erasure. Physical deletion is allowed only under defined dependency, retention and legal-hold rules.

Indexes: organization + status; organization + property; due time + workflow status; provider + appointment window; lease + effective dates; outbox publish state; unique idempotency scope + key. Access and ownership queries must be load-tested.

### 10.2–10.5 Entity groups

See full entity tables in original proposal for identity/platform, property/leasing, vendor/workflow/procurement, and financial/ecosystem entities. Key invariants: separate platform subscription invoices from landlord rent invoices and provider invoices; partner commission only on eligible settled transactions; stock movements append-only.

---

## 11. State machines and invariants

- Application: draft → submitted → reviewing ↔ info_required → approved/rejected/withdrawn. Approval does not execute a lease.
- Lease: draft → pending_signature → executed → active → notice → ended. Renewal is a new version/agreement with explicit continuity.
- Turnover: forecast → tentative → confirmed → possession_returned → make_ready → ready, with paused/cancelled/replanned paths.
- Work order: draft → authorized → offered → accepted → scheduled → in_progress → completed → verified → closed.
- Proposal: pending → approved/rejected/expired → executing → succeeded/failed. Hash/version/authority mismatch invalidates execution.
- Subscription: trial/free → pending_payment → active → past_due → grace → suspended/cancelled. Demo activation cannot create production entitlements.
- Invoice: draft → issued → partially_paid/paid/voided, with credit notes rather than destructive edits.
- Payment: created → processing → settled/failed; refunds/disputes tracked separately.

All transitions run through domain services and enforce allowed actor, prerequisites, side effects, idempotency and audit.

---

## 12. Monetization and partner strategy

### 12.1 Existing pricing facts versus decisions

OBSERVED in `lib/billing/pricing.ts`: monthly standard per-unit INR amounts homes ₹299, retail/office ₹699, industrial ₹1,999; sale ₹149/₹349/₹999; 18% configured GST; annual multiplier 10; sale window 1 Dec 2026–31 Mar 2027 IST; cap 500 paying accounts. Volume discounts 6–20 units 15%, 21–50 units 25%; code returns 0% above 50, which requires a commercial decision. Code also maps unknown segments to industrial, which should become explicit validation rather than silent pricing.

OBSERVED in `lib/plans.ts`: proposed annual per-property cards ₹499/₹1,499/₹2,999; starter label and caps conflict with cards/feature matrix. Free maximum one unit is a separate billing constant; do not assume the quote function alone enforces free entitlement or excludes the first unit from a paid portfolio.

DECISION: approve one charging meter and reconcile all displays, caps and entitlements (D01).

### 12.2 Revenue lanes

| Lane | Proposed revenue | Release condition |
|---|---|---|
| SaaS | Approved tier/unit subscription, seats and enterprise contracts | Live billing, entitlements and invoice correctness |
| Usage | Disclosed messaging/AI/storage/e-sign or screening cost recovery to landlord | Published quotas, opt-in, cost visibility |
| Services | Flat dispatch/coordination fee or disclosed commission | Vendor agreement, tax, disputes and settlement model |
| Partner | Single-level SaaS affiliate, reseller or qualified-introduction reward | Eligible settled invoice, refund hold, counsel/tax review |
| Commerce | Product margin, vendor-fulfilled commission, procurement service | Seller/MoR clarity, inventory, returns, warranty |
| Managed equipment | Sale/lease, installation, maintenance | Certified partners, finance/liability/warranty approval |
| Payments | Optional explicitly approved service fee, not assumed rent skim | Provider permission, legal/commercial decision, disclosure |

### 12.3–12.4 Partner and product opportunities

Support developer/builder onboarding, broker/agent introductions, architects, contractors, photographers, access installers and safety partners. Confirm affiliate terms before activating. Initial low-complexity catalog; site stock separate from platform inventory. Future access/fire programs require qualified partners and independent safety gates. No forced lock-in.

---

## 13. Moats and measurable value

| Advantage hypothesis | Mechanism | Evidence to seek |
|---|---|---|
| Spatial inventory | Accurate floor/unit data and connected media | Lower invalid inquiries, faster ready-to-publish |
| Governed autopilot | Contracts + budgets + durable execution | Fewer manual touches, fewer missed turnovers |
| Operational context | Linked lease, access, vendor and completion history | Better scheduling and fewer repeat repairs |
| Provider density | Reliable local availability by trade | Higher acceptance and SLA attainment |
| Bring-your-own assistant | Portability through common commands | Successful workflows across independent hosts |
| Profile breadth | Shared core with specialized property rules | Mixed-portfolio retention without separate software |
| Commerce attach | Right compatible supply at the right event | Positive contribution margin and low return rate |
| Trust | Audit, safe delegation, transparent fees | Enterprise wins, low security/dispute incidence |

These are hypotheses, not proven moats. Do not collect or sell tenant data to manufacture a data moat. Customer export and interoperability are product requirements.

---

## 14. Enterprise non-functional requirements

Targets below are proposed engineering acceptance criteria, not current SLAs.

- Availability: target 99.9% monthly for core API after operational validation.
- Recovery: proposed RPO ≤15 minutes, RTO ≤4 hours; demonstrate restore in staging before promising them.
- Performance: target p95 interactive API <1 second excluding external model/provider latency.
- Identity: MFA for privileged users; SSO/SCIM in enterprise release.
- Data: encryption in transit/at rest; credential vault; retention, legal holds, export and erasure.
- Uploads: allowlisted formats, size limits, scanner/quarantine; CAD/media sandboxed.
- Finance: segregation of platform/landlord funds; signed webhooks; reconciliation.
- Operations: feature flags and per-org autonomy kill switch; audit correlation; incident response.
- Accessibility: target WCAG 2.2 AA for core flows.
- Supply chain: SBOM, secret scanning, reviewed critical vulnerabilities.

Enterprise-ready is a gated release designation. Do not imply SOC 2/ISO certification because the design includes these items.

---

## 15. Existing implementation preservation and migration

1. Pin the current commit and create a real capability matrix.
2. Bring historical PRD references into the repository or a documented accessible system.
3. Preserve functioning listing, spatial, application, provider, shop and role surfaces.
4. Add memberships/delegations alongside legacy `users.tenant_id`; backfill and compare authorization before switching.
5. Introduce policy/service boundaries around high-risk actions first.
6. Reconcile pricing/caps/public cards, billing and invoice models together.
7. Introduce workflow/outbox and standing-policy tables with auto-execution OFF.
8. Migrate SQLite data to Postgres with mapping, counts, checksums, backup and rollback plan.
9. Replace demo auth/integrations by environment-scoped adapters; production fail-closed.
10. Add remote MCP and host tests against the same service layer. No Ask Easy bypass.
11. Release automation pack to opted-in organizations with budgets, kill switch and incident owner.

Preserve repository design preferences as a separate decision: existing shadcn/Tailwind versus requested DaisyUI is not silently resolved by this PRD (D14).

---

## 16. Delivery plan and launch gates

### R0 — Source of truth and commercial sign-off

Capability matrix, profile matrix, decisions register, price/entitlement reconciliation, dependency graph and threat model. No new production autonomy.

### R1 — Commercial core launch

Real organization onboarding; scoped staff/manager access; working property profiles; accurate listings/spatial features; visit/application lifecycle; live platform subscription/invoice; secure sessions; real notifications; monitoring/backups; no demo privilege path. At least one independently tested external assistant: authenticated read → draft → proposal → authorized human execution.

### R1A — Autonomous operations launch pack

Signed cleaning agreement + distinct standing policy; turnover forecast/confirmed possession and renewal cancellation; one order per turnover; cleaning→capture dependency; photography assignment and profile-based publish gate; budget/cap enforcement, durable timers, idempotency and kill switch.

R1 and R1A may launch together when both gates pass. Do not launch only R1 and market it as R1A.

### R2 — Enterprise and marketplace expansion

SSO/SCIM, advanced management-company portfolios, accounting export, live collection/reconciliation, partner commissions, commerce, country packs.

### R3 — Managed physical systems

Access devices, stocked/private-label goods, fire-service/equipment programs. Separate safety/legal gate per product/jurisdiction.

No date promises until technical spikes, dependency contracts and team capacity are established.

---

## 17. Test strategy and acceptance scenarios

### 17.1 Cross-cutting mandatory tests

Cross-org IDOR denial; manager delegation expiry; wrong/expired tokens; prompt injection resistance; approval binding; at-least-once without duplicate money/orders; concurrency budget/access; restore and timer recovery; price/invoice integrity; privacy export/erasure.

### 17.2 Flagship executable acceptance cases

AT01–AT10 as defined in the owner proposal (cleaning preparation, possession hold, renewal cancel/replan, budget concurrency, new unit media, profile variation without mandatory Matterport, external assistant approval flow, price integrity, vendor evidence ≠ auto-pay, access safety / no rent lockout).

### 17.3 CI and release gates

Lint/typecheck/build; unit/property tests; migration and repository isolation; domain state-machine tests; browser acceptance; MCP client contracts; dependency/license/secret scans; load and backup checks for release candidates. Human review for auth, billing, policies and migrations. Green CI is necessary, not sufficient for launch.

---

## 18. Metrics and operating dashboards

North-star candidate: verified property-operating workflows completed correctly per active organization, coupled with retention and contribution margin. Do not optimize raw tool calls or chat messages.

Track product, automation, service, trust, business and AI metrics as specified in the owner proposal.

---

## 19. Decisions requiring explicit owner approval

**Resolved 6 Nov 2026** — see [`prd-decisions-d01-d15.md`](./prd-decisions-d01-d15.md) and [`prd-unified-approval-checklist.md`](./prd-unified-approval-checklist.md). Rows below remain the decision index; statuses are Approved.

| ID | Decision |
|---|---|
| D01 | Canonical charging meter, billable-unit definition, free tier, proration, lock renewal and enterprise volume terms |
| D02 | Ask Easy/API/MCP/automation package entitlements; do not infer all from one existing flag |
| D03 | Whether R1 and R1A launch together; exact truthful commercial promise |
| D04 | Supported property profiles and specialist-profile exclusions at launch |
| D05 | Postgres cutover versus risk-accepted single-instance pilot; recovery objectives |
| D06 | Production model provider, data handling, provider cost budget and fallback behavior |
| D07 | First tested assistant hosts and exact integration support |
| D08 | Standing-authority policy update replacing categorical never-auto behavior for bounded routines |
| D09 | Which actions need two independent humans versus ordinary user confirmation |
| D10 | Billing, notification, KYC, e-sign, messaging and workflow vendors |
| D11 | Service fee, commission, seller/MoR and refund/dispute model by country |
| D12 | Affiliate terms including proposed 20% schedule; partner licensing review |
| D13 | Country enablement and tax/compliance review process |
| D14 | UI framework direction and design consistency; not conflated with security readiness |
| D15 | Media requirements, rights and publication override policy per profile |

D01–D15 are Approved. Implementation agents must follow the decisions register; do not invent live money, weaken never-auto, or claim untested host MCP support.

---

## 20. Master implementation-agent prompt

Use this unified PRD as the proposed specification. Do not combine obsolete chat specifications.

First: pin commit; inspect schema/auth/billing/MCP/spatial; produce factual capability matrix; list conflicts and unresolved D01–D15; present smallest incremental architecture/migration plan for owner approval.

Preserve multi-profile scope, free seeker discovery, existing spatial/listings/applications/provider flows, India/country-pack seams, tenant isolation.

Build explicit membership/delegation authorization; common domain-command layer; versioned tools and exact approval binding; durable workflows; signed vendor agreements + standing policies; truthful billing; assistant interoperability without a new general-purpose agent app.

Safety: never trust model-asserted tenant/authority; do not silently weaken never-auto; human approvers only; never auto-lock occupants, infer possession from end date, issue safety certificates, treat application as lease, or mark money settled from chat; no host MCP claims until tested; no Matterport mandate where profile policy does not require it.

Delivery: one reviewable vertical slice at a time; no wholesale rewrite for folder aesthetics; honest test reporting; no publish/deploy/charge/PR without applicable human authorization.

First milestone: verified capability matrix + decisions + updated ERD, then R1/R1A slices according to the approved launch decision.

---

## 21. Final release definition

The complete vision is a multi-profile property platform with governed autonomy and an ecosystem, not merely a listing website or a chatbot.

A launch is credible when actual organizations can onboard, pay the correct invoice, operate their supported inventory, and use a tested assistant through the same authorization rules. An autonomous-operations launch additionally requires real agreement-bound cleaning/capture orders, correct vacancy/possession handling, vendor responses, durable scheduling and recoverable exceptions.

No label in this PRD turns an unimplemented feature into a shipped one.

## 22. Source record

Repository evidence (reviewed in this conversation):

- https://github.com/deskulpt/Property-Manager/blob/4bb9d42234204ba70a4e02b656f060e68ccb7b49/docs/prd.md
- https://github.com/deskulpt/Property-Manager/blob/4bb9d42234204ba70a4e02b656f060e68ccb7b49/lib/billing/pricing.ts
- https://github.com/deskulpt/Property-Manager/blob/4bb9d42234204ba70a4e02b656f060e68ccb7b49/lib/plans.ts
- `docs/business-model-money.md`, `docs/launch-readiness-review.md`, `lib/mcp/policy.ts` and other targeted reads listed in §0.

Implementation-time authoritative checks:

- Current official Model Context Protocol specification: https://modelcontextprotocol.io/
- OWASP MCP security checklist: https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html
- Official documentation and contracts for each selected assistant host, payment, messaging, access-control and signature provider.

External host compatibility, current legal requirements and provider commercial terms must be reverified before release; this document does not certify them.

---

*Store path for agents:* this file. On owner approval, reconcile into repository `docs/prd.md` in one reviewed change. Companion gap ledger: [prd-scope-gap-oct31.md](./prd-scope-gap-oct31.md).

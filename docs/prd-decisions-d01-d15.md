# D01–D15 decisions register (PARTIAL — Aloke Approve with advisors’ changes 7 Nov)

**Status:** PARTIAL · Aloke recorded **Approve with advisors' changes** on **D11, D12, D13, D15** · **Not fully approved** until advisor gates/flags met · Advisor gates remain **OFF** · Finance D09 Approve · Eng Rejects D07/D09  
**PR:** [#45](https://cursor.com/codebase/deskulpt/Property-Manager/pull/45)  
**Legal caveat:** conditional advisory only — not licensed go-live auth.

---

## Aloke 7 Nov — direct decisions

### D11 / D12 / D13 / D15 — Aloke status

| ID | Aloke | Fully approved? |
| --- | --- | --- |
| D11 | **Approve with advisors' changes** | **No** |
| D12 | **Approve with advisors' changes** | **No** |
| D13 | **Approve with advisors' changes** | **No** |
| D15 | **Approve with advisors' changes** | **No** |

His approval is on the register. Live/feature flags stay **OFF** until Finance/Legal/Eng conditions are met.

### Entities

| Legal name | Role |
| --- | --- |
| **Deskulpt Inc** | Federal Canada; **GST/HST resolved** (checklist + CountryPack CA `taxRegistrationId`; tax adapter flags **OFF**) |
| **Deskulpt Commerce India Pvt Ltd** | Indian subsidiary (planned) |
| Indian CA / lawyers | **Not yet engaged** |

### Ontario pricing (CFO hybrid — config, not final)

CA$3–5 / unit / mo + **0.5–1% of rent** capped **CA$15 / unit / mo** + **CA$10 / mo min** on payments plans.

### Refunds (CFO D09)

2nd approver when refund **> CAD 500** or **> 1 month subscription**; every payout/deposit release = two people; **no self-approve**; **CAD 2,000 / day / approver**; books-exportable audit. Eng Reject still blocks production dual-control.

### AI

**Cloudflare AI Gateway** + free **Workers AI** + **daily neuron limits**; **real PII blocked** until data-handling reviewed.

### Country paths (`/in` + `/ca`) — Aloke product decision (D13-related)

| Rule | Spec |
| --- | --- |
| Hosts | `easyrental.space/in/` · `easyrental.space/ca/` |
| New countries | **Config-only** via `CountryPack.pathSegment` (`/us`, `/br`, …) |
| Root `/` | Picker or geo **suggest** — **never auto-redirect without consent** |
| CA pack entity | **Deskulpt Inc** (federal Canada) · CAD · Stripe Tax/HST gated · Connect DIRECT+PAD **OFF** · ON lease templates |
| IN pack entity | **Deskulpt Commerce India Pvt Ltd** · INR · tax matrix gated · Razorpay **OFF** · TG disclaimers |
| AI (sitewide) | Cloudflare **AI Gateway** + **Workers AI** + daily **neuron limits**; **real PII blocked** (`realPiiAiConnectorsMedia` OFF) |
| SEO | hreflang · per-country sitemaps/canonicals · 301 legacy → `/in`\|`/ca` |
| Accounts | One country ISO each; fail-closed |
| Owner PR | Country path routing (`cursor/country-path-in-ca-1de0`) |
| Approvals | D11–D15 = Aloke **AwC**; live **flags OFF** — not fully approved |

---

## D11 — Aloke Approve with advisors' changes ⚑ (not fully approved)

| Approver | Status |
| --- | --- |
| Aloke | **Approve with advisors' changes** |
| Legal | AwC — design/test only, not live |
| Finance | AwC — Connect DIRECT + PAD + hybrid pricing |
| Eng/Security | AwC |

**Gates still OFF:** `ontarioConnectDirectPad`; tenant card fee permanent OFF; before-live Legal list (funds-flow, Stripe acceptance, ON counsel + CPA); HST compute ourselves.

---

## D12 — Aloke Approve with advisors' changes ⚑ (not fully approved)

Affiliate documented; **flag OFF** until Legal/Finance activation pack (disclosure, clawbacks, tax).

---

## D13 — Aloke Approve with advisors' changes ⚑ (not fully approved)

Legal wording: “Telangana and Ontario selected; synthetic demos allowed; production gated by feature.”  
Entity: **Deskulpt Commerce India Pvt Ltd**; Razorpay in-principle first; Route/deposits OFF until written approval; Indian CA/lawyers **not yet engaged**.

---

## D15 — Aloke Approve with advisors' changes ⚑ (not fully approved)

Matterport/360 = paid add-on or BYO; media storage caps; real-PII media blocked until DPA/retention.

---

## GST/HST number — **resolved**

Deskulpt Inc GST/HST from Aloke PRD checklist is wired into `lib/billing/tax-identity.ts`, Ontario application-fee HST lines, and monthly statement tax footer. Live Connect flags remain **OFF**.

## Still-open items (summary)

See end-of-run LEGAL / FINANCE / TECH in [`cfo-review-applied-nov7.md`](./cfo-review-applied-nov7.md). Highlights: **Deskulpt Inc GST/HST resolved** (pack config); engage IN counsel/CA; Razorpay in-principle; ON counsel+CPA before Connect live; Eng D07/D09 Rejects; Cloudflare AI data-handling review; dual-control production implementation.

**Fully approved: 0.**

---

*End decisions register.*

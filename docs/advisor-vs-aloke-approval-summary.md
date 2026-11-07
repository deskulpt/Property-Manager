# Advisor vs Aloke approval summary — 7 Nov 2026

**Purpose:** Flag every D0x where Aloke marked **Approve** but any required advisor is **Approve with changes** or **Reject**.  
**Sources:** [`prd-unified-approval-checklist.md`](./prd-unified-approval-checklist.md) · [`prd-decisions-d01-d15.md`](./prd-decisions-d01-d15.md)  
**Rule:** Fully approved only when Aloke + all required advisors signed. Aloke marks preserved; they do **not** alone equal full approval.  
**Eng baseline:** GH `main` @ `5ca1b25` (checklist absent) — Eng verdicts conditional on checklist commit on `cursor/cfo-review-pricing-tax-0ae5`.

| ID | Aloke | Blocking advisor signal(s) | Fully approved? |
| --- | --- | --- | --- |
| D01 | Approve | Legal AwC · Finance AwC · Eng AwC | **No** |
| D02 | Approve | Legal AwC · Finance AwC · Eng AwC | **No** |
| D03 | Approve | Eng AwC (Legal Approve · Finance Approve) | **No** |
| D04 | Approve | Legal AwC · Eng AwC | **No** |
| D05 | Approve | Legal AwC · Finance AwC · Eng AwC | **No** |
| D06 | Approve | Legal AwC · Finance AwC · Eng AwC | **No** |
| D07 | Approve | **Eng Reject** · Legal AwC | **No** |
| D08 | Approve | Eng AwC (Legal Approve · Finance Approve) | **No** |
| D09 | Approve | **Eng Reject** · Legal AwC · Finance AwC | **No** |
| D14 | Approve | Legal AwC · Eng AwC | **No** |

### Aloke not Approved (excluded from “Aloke Approved but advisors disagree” set; still open)

| ID | Aloke | Advisors | Note |
| --- | --- | --- | --- |
| D10 | Pending | All AwC | Go-live gate |
| D11 | Pending | All AwC | MoR — only Aloke can approve |
| D12 | Pending | All AwC | Affiliate inactive — only Aloke can approve |
| D13 | Pending | **Legal Reject** · Finance/Eng AwC | Wording must become India demo only… |
| D15 | Pending | All AwC | Matterport add-on — only Aloke can approve |

### Reject blockers (must remediate before Aloke final)

1. **D07 Eng Reject** — prod OAuth, tenant-bound tokens, revocation, cert matrix.  
2. **D09 Eng Reject** — dual control + tamper-resistant audit (distinct approvers, request binding, expiry/replay/race). Security sibling: `lib/mcp/approvals.ts`.  
3. **D13 Legal Reject** — replace live/launch wording with: “India demo only; production pending documented country/state/feature gates; Canada sales parked.”

### Counts

- Aloke Approve but **not fully approved:** **D01–D09, D14** (10 items).  
- Fully approved today: **0**.  
- Advisor Reject open: **3** (D07 Eng, D09 Eng, D13 Legal).

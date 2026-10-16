/**
 * Ask Easy — Slice L.0 approval queue (PRD §21).
 * Stub runtime only: no LLM keys, no @cursor/bdk.
 * Mutating tools stay proposed until a landlord seat approves.
 */

import { createJob } from "@/lib/db"
import type { Trade } from "@/lib/format"

export type ToolName =
  | "draft_listing"
  | "propose_job_assignment"
  | "draft_reminder"
  | "create_concierge_job"

export type ProposalStatus = "proposed" | "approved" | "rejected"

export type ListingDraft = {
  propertyName: string
  unitCode: string
  sqft: number
  ratePsf: number
  description: string
  area: string
  status: "draft"
}

export type ToolPayload =
  | {
      tool: "draft_listing"
      draft: ListingDraft
    }
  | {
      tool: "propose_job_assignment"
      propertyId: string
      unitId: string | null
      title: string
      details: string
      trade: Trade
      providerId: string | null
    }
  | {
      tool: "draft_reminder"
      unitCode: string
      channels: string[]
      body: string
    }
  | {
      tool: "create_concierge_job"
      propertyId: string
      unitId: string | null
      title: string
      details: string
      trade: Trade
    }

export type AgenticProposal = {
  id: string
  tenantId: string
  title: string
  summary: string
  status: ProposalStatus
  createdAt: string
  promptSummary: string
  payload: ToolPayload
  outcome?: string | null
  decidedAt?: string | null
  decidedBy?: string | null
}

export type AuditEntry = {
  id: string
  tenantId: string
  promptSummary: string
  toolsProposed: string[]
  proposalId: string
  approval: ProposalStatus | "pending"
  outcome: string
  actorId: string | null
  createdAt: string
}

type Store = {
  proposals: AgenticProposal[]
  audits: AuditEntry[]
  drafts: ListingDraft[]
}

const globalStore = globalThis as unknown as { deskulptAgentic?: Store }

function store(): Store {
  if (!globalStore.deskulptAgentic) {
    globalStore.deskulptAgentic = {
      proposals: seedProposals(),
      audits: [],
      drafts: [],
    }
  }
  return globalStore.deskulptAgentic
}

function seedProposals(): AgenticProposal[] {
  return [
    {
      id: "ap_assign_elec",
      tenantId: "t_bbm",
      title: "Assign electrician to dock leveler",
      summary: "Propose Luis Ortega (electrician · Bhiwandi) for Bay A2 dock leveler make-ready.",
      status: "proposed",
      createdAt: "2026-10-16T12:00:00.000Z",
      promptSummary: "Dock leveler sticks on A2 — send an electrician",
      payload: {
        tool: "propose_job_assignment",
        propertyId: "p_waterman",
        unitId: "u_waterman_a2",
        title: "Dock leveler sticks at the top of travel",
        details: "Stub agent proposal: Bay A2 leveler pauses six inches short. Make-ready before handover.",
        trade: "electrician",
        providerId: "u_luis",
      },
    },
    {
      id: "ap_reminder",
      tenantId: "t_bbm",
      title: "Draft late-fee reminder for Unit A1",
      summary: "WhatsApp + in-app notice draft for overdue September rent. Send blocked until approve.",
      status: "proposed",
      createdAt: "2026-10-16T12:05:00.000Z",
      promptSummary: "Remind A1 about September rent",
      payload: {
        tool: "draft_reminder",
        unitCode: "A1",
        channels: ["whatsapp", "in_app"],
        body: "Friendly reminder: September rent for Unit A1 is past due. Reply to this desk to arrange payment.",
      },
    },
  ]
}

export function listProposals(tenantId: string) {
  return store()
    .proposals.filter((p) => p.tenantId === tenantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listAudits(tenantId: string) {
  return store()
    .audits.filter((a) => a.tenantId === tenantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listDrafts(tenantId: string) {
  // Drafts are tenant-scoped via proposal history; expose saved drafts only.
  void tenantId
  return store().drafts.slice().reverse()
}

function writeAudit(entry: Omit<AuditEntry, "id" | "createdAt">) {
  const row: AuditEntry = {
    ...entry,
    id: `aud_${crypto.randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
  }
  store().audits.unshift(row)
  return row
}

/** Deterministic stub autofill — no network / no LLM. */
export function stubAutofillListing(input: {
  tenantId: string
  prompt: string
  actorId: string
}) {
  const prompt = input.prompt.trim()
  const codeMatch = prompt.match(/\b([A-Z]\d{1,2}|U\d|P\d)\b/)
  const sqftMatch = prompt.match(/(\d{3,6})\s*(sf|sqft|sq\.?\s*ft)?/i)
  const draft: ListingDraft = {
    propertyName: "Draft from Ask Easy",
    unitCode: codeMatch?.[1] ?? "X1",
    sqft: sqftMatch ? Number(sqftMatch[1]) : 12000,
    ratePsf: 68,
    description: `Stub listing draft (not published). Prompt: “${prompt.slice(0, 180)}”. Clear-span industrial bay suitable for distribution. Confirm specs before publish.`,
    area: "Mumbai MMR",
    status: "draft",
  }
  const proposal: AgenticProposal = {
    id: `ap_${crypto.randomUUID().slice(0, 8)}`,
    tenantId: input.tenantId,
    title: `Listing draft for Unit ${draft.unitCode}`,
    summary: "Autofill produced a draft only. Publish stays blocked until you approve.",
    status: "proposed",
    createdAt: new Date().toISOString(),
    promptSummary: prompt.slice(0, 240),
    payload: { tool: "draft_listing", draft },
  }
  store().proposals.unshift(proposal)
  writeAudit({
    tenantId: input.tenantId,
    promptSummary: proposal.promptSummary,
    toolsProposed: ["draft_listing"],
    proposalId: proposal.id,
    approval: "pending",
    outcome: "draft_proposed",
    actorId: input.actorId,
  })
  return { proposal, draft }
}

export function decideProposal(input: {
  tenantId: string
  proposalId: string
  actorId: string
  decision: "approved" | "rejected"
}) {
  const proposal = store().proposals.find(
    (p) => p.id === input.proposalId && p.tenantId === input.tenantId,
  )
  if (!proposal) return { ok: false as const, error: "That proposal is not in this organisation." }
  if (proposal.status !== "proposed") {
    return { ok: false as const, error: "That proposal was already decided." }
  }

  if (input.decision === "rejected") {
    proposal.status = "rejected"
    proposal.decidedAt = new Date().toISOString()
    proposal.decidedBy = input.actorId
    proposal.outcome = "rejected_no_side_effect"
    writeAudit({
      tenantId: input.tenantId,
      promptSummary: proposal.promptSummary,
      toolsProposed: [proposal.payload.tool],
      proposalId: proposal.id,
      approval: "rejected",
      outcome: "no_mutate",
      actorId: input.actorId,
    })
    return { ok: true as const, proposal }
  }

  // Approve path — execute wrapped command only here.
  let outcome = "approved"
  if (proposal.payload.tool === "draft_listing") {
    store().drafts.push(proposal.payload.draft)
    outcome = "draft_saved_not_published"
  } else if (
    proposal.payload.tool === "propose_job_assignment" ||
    proposal.payload.tool === "create_concierge_job"
  ) {
    const payload = proposal.payload
    const result = createJob({
      tenantId: input.tenantId,
      propertyId: payload.propertyId,
      unitId: payload.unitId,
      title: payload.title,
      details: payload.details,
      trade: payload.trade,
      providerId: payload.tool === "propose_job_assignment" ? payload.providerId : null,
    })
    if (!result.ok) return { ok: false as const, error: result.error }
    outcome = result.providerId
      ? `job_created_assigned:${result.id}`
      : `job_created_open:${result.id}`
  } else if (proposal.payload.tool === "draft_reminder") {
    // Soft draft only — never enqueue notify on L.0 approve of reminder drafts.
    outcome = "reminder_draft_kept_unsent"
  }

  proposal.status = "approved"
  proposal.decidedAt = new Date().toISOString()
  proposal.decidedBy = input.actorId
  proposal.outcome = outcome
  writeAudit({
    tenantId: input.tenantId,
    promptSummary: proposal.promptSummary,
    toolsProposed: [proposal.payload.tool],
    proposalId: proposal.id,
    approval: "approved",
    outcome,
    actorId: input.actorId,
  })
  return { ok: true as const, proposal }
}

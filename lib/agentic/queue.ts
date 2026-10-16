/**
 * Ask DeSkulpt — approval queue stub (PRD §21 when published).
 * No live LLM. Actions stay proposed until a landlord seat approves.
 */
export type AgenticProposal = {
  id: string
  tenantId: string
  title: string
  summary: string
  status: "proposed" | "approved" | "rejected"
  createdAt: string
}

export const DEMO_PROPOSALS: AgenticProposal[] = [
  {
    id: "ap_1",
    tenantId: "t_bbm",
    title: "Draft late-fee reminder for Unit A1",
    summary: "Propose WhatsApp + in-app notice for overdue September rent (demo).",
    status: "proposed",
    createdAt: "2026-10-16T12:00:00.000Z",
  },
  {
    id: "ap_2",
    tenantId: "t_bbm",
    title: "Suggest listing copy for Unit C2",
    summary: "Rewrite bay description for industrial search keywords (demo).",
    status: "proposed",
    createdAt: "2026-10-16T12:05:00.000Z",
  },
]

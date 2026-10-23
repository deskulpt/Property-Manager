import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch } from "../lib/pm-client.js";
import { pendingProposalStub, stubProposalId } from "../lib/stub-proposal.js";

/** L2 landlord / L3 property manager — approve/deny application. */
export default defineTool({
  description:
    "Propose approve or deny a lease application. Proposal only — Approve in Ask Easy to run reviewApplication.",
  execution: "server",
  effect: "write",
  dryRunResult: ({ applicationId, decision }) => ({
    proposal_id: "dry_run",
    applicationId,
    decision,
    status: "pending_approval",
    executed: false,
  }),
  inputSchema: z.object({
    applicationId: z.string().min(1),
    decision: z.enum(["approve", "deny"]),
    note: z.string().optional(),
  }),
  async execute(input, ctx) {
    const live = await pmFetch("/api/ask-easy/propose/application-decision", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (live.ok) {
      return {
        source: "property-manager",
        executed: false,
        status: "pending_approval",
        ...live.body,
      };
    }
    return pendingProposalStub({
      reason: live.reason,
      proposal_id: stubProposalId(ctx, "prop_app_eval", "app"),
      tool: "propose_application_decision",
      preview: `${input.decision} application ${input.applicationId}.`,
      extra: {
        applicationId: input.applicationId,
        decision: input.decision,
      },
    });
  },
});

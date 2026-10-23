import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch } from "../lib/pm-client.js";
import { pendingProposalStub, stubProposalId } from "../lib/stub-proposal.js";

/** L2/L3 — create+assign concierge job; never notify without Approve. */
export default defineTool({
  description:
    "Propose create+assign a concierge job to a provider. NEVER notifies until landlord Approve.",
  execution: "server",
  effect: "write",
  dryRunResult: ({ trade, providerId, title }) => ({
    proposal_id: "dry_run",
    trade,
    providerId,
    title,
    status: "pending_approval",
    executed: false,
    notified: false,
  }),
  inputSchema: z.object({
    trade: z.enum(["electrician", "plumber", "cleaning", "courier"]),
    providerId: z.string().min(1),
    title: z.string().min(1),
    unitId: z.string().optional(),
    details: z.string().optional(),
  }),
  async execute(input, ctx) {
    const live = await pmFetch("/api/ask-easy/propose/job-assignment", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (live.ok) {
      return {
        source: "property-manager",
        executed: false,
        notified: false,
        status: "pending_approval",
        ...live.body,
      };
    }
    return pendingProposalStub({
      reason: live.reason,
      proposal_id: stubProposalId(ctx, "prop_job_eval", "job"),
      tool: "propose_job_assignment",
      preview: `Assign ${input.providerId} (${input.trade}) — “${input.title}”.`,
      note: "Approve runs create/assign/notify. Reject = no job, no notify.",
      extra: {
        trade: input.trade,
        providerId: input.providerId,
        title: input.title,
        unitId: input.unitId ?? null,
        notified: false,
      },
    });
  },
});

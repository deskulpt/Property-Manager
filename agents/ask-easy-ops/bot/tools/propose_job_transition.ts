import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch } from "../lib/pm-client.js";
import { pendingProposalStub, stubProposalId } from "../lib/stub-proposal.js";

/** L5 service provider — accept/complete job. */
export default defineTool({
  description:
    "Propose accepting or completing a provider job. Proposal only — Approve applies transition.",
  execution: "server",
  effect: "write",
  dryRunResult: ({ jobId, transition }) => ({
    proposal_id: "dry_run",
    jobId,
    transition,
    status: "pending_approval",
    executed: false,
  }),
  inputSchema: z.object({
    jobId: z.string().min(1),
    transition: z.enum(["accept", "complete"]),
    note: z.string().optional(),
  }),
  async execute(input, ctx) {
    const live = await pmFetch("/api/ask-easy/propose/job-transition", {
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
      proposal_id: stubProposalId(ctx, "prop_jobtx_eval", "jobtx"),
      tool: "propose_job_transition",
      preview: `${input.transition} job ${input.jobId}.`,
      note: "L5 provider pack. Approve applies SM transition; reject leaves status unchanged.",
      extra: {
        jobId: input.jobId,
        transition: input.transition,
        rolePack: "L5",
      },
    });
  },
});

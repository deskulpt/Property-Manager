import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch } from "../lib/pm-client.js";
import { pendingProposalStub, stubProposalId } from "../lib/stub-proposal.js";

/** L4 lease applicant — request a visit slot. */
export default defineTool({
  description:
    "Propose a visit request for an applicant (in-person or virtual). Proposal / requested state — landlord confirms separately.",
  execution: "server",
  effect: "write",
  dryRunResult: ({ unitId, visitType }) => ({
    proposal_id: "dry_run",
    unitId,
    visitType,
    status: "pending_approval",
    executed: false,
  }),
  inputSchema: z.object({
    unitId: z.string().min(1),
    visitType: z.enum(["in_person", "virtual"]),
    preferredSlot: z.string().optional().describe("ISO datetime or free-text preference."),
    note: z.string().optional(),
  }),
  async execute(input, ctx) {
    const live = await pmFetch("/api/ask-easy/propose/visit-request", {
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
      proposal_id: stubProposalId(ctx, "prop_visit_eval", "visit"),
      tool: "propose_visit_request",
      preview: `${input.visitType} visit for unit ${input.unitId}${
        input.preferredSlot ? ` @ ${input.preferredSlot}` : ""
      }.`,
      note: "L4 applicant pack. Landlord still confirms via propose_visit_decision on desk.",
      extra: {
        unitId: input.unitId,
        visitType: input.visitType,
        preferredSlot: input.preferredSlot ?? null,
        rolePack: "L4",
      },
    });
  },
});

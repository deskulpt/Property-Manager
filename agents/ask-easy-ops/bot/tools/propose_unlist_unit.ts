import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch } from "../lib/pm-client.js";
import { pendingProposalStub, stubProposalId } from "../lib/stub-proposal.js";

/** L2 landlord / L3 property manager — lease onboard delist. */
export default defineTool({
  description:
    "Propose delisting a unit (status → hold). Proposal only — never notifies applicants. Landlord Approve required.",
  execution: "server",
  effect: "write",
  dryRunResult: ({ unitId }) => ({
    proposal_id: "dry_run",
    unitId,
    action: "unlist",
    status: "pending_approval",
    executed: false,
  }),
  inputSchema: z.object({
    unitId: z.string().min(1).describe("Unit id in the landlord tenant."),
  }),
  async execute({ unitId }, ctx) {
    const live = await pmFetch("/api/ask-easy/propose/unlist-unit", {
      method: "POST",
      body: JSON.stringify({ unitId }),
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
      proposal_id: stubProposalId(ctx, "prop_unlist_eval", "unlist"),
      tool: "propose_unlist_unit",
      preview: `Set unit ${unitId} status → hold. No applicant notify.`,
      extra: { unitId, action: "unlist" },
    });
  },
});

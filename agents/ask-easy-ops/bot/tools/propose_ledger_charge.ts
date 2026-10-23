import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch } from "../lib/pm-client.js";
import { pendingProposalStub, stubProposalId } from "../lib/stub-proposal.js";

/** L2 landlord accountant — never silent money. */
export default defineTool({
  description:
    "Propose a ledger charge (rent/fee line). NEVER posts money silently — returns proposal_id; Approve required.",
  execution: "server",
  effect: "write",
  dryRunResult: ({ unitId, amountCents, description }) => ({
    proposal_id: "dry_run",
    unitId,
    amountCents,
    description,
    status: "pending_approval",
    executed: false,
    posted: false,
  }),
  inputSchema: z.object({
    unitId: z.string().min(1),
    amountCents: z.number().int().positive(),
    description: z.string().min(1),
    dueOn: z.string().optional().describe("ISO date YYYY-MM-DD."),
  }),
  async execute(input, ctx) {
    const live = await pmFetch("/api/ask-easy/propose/ledger-charge", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (live.ok) {
      return {
        source: "property-manager",
        executed: false,
        posted: false,
        status: "pending_approval",
        ...live.body,
      };
    }
    return pendingProposalStub({
      reason: live.reason,
      proposal_id: stubProposalId(ctx, "prop_charge_eval", "charge"),
      tool: "propose_ledger_charge",
      preview: `Charge ${input.amountCents} on unit ${input.unitId}: ${input.description}.`,
      note: "Never-auto money: Approve to post. Reject leaves ledger unchanged.",
      extra: {
        unitId: input.unitId,
        amountCents: input.amountCents,
        description: input.description,
        dueOn: input.dueOn ?? null,
        posted: false,
      },
    });
  },
});

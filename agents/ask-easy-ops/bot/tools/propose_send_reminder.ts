import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch } from "../lib/pm-client.js";
import { pendingProposalStub, stubProposalId } from "../lib/stub-proposal.js";

/** L2 accountant — never-auto notify/send. */
export default defineTool({
  description:
    "Propose sending a drafted reminder. NEVER sends silently — Approve required.",
  execution: "server",
  effect: "write",
  dryRunResult: ({ draftId }) => ({
    proposal_id: "dry_run",
    draftId,
    status: "pending_approval",
    executed: false,
    sent: false,
  }),
  inputSchema: z.object({
    draftId: z.string().min(1).describe("Id from draft_reminder."),
  }),
  async execute({ draftId }, ctx) {
    const live = await pmFetch("/api/ask-easy/propose/send-reminder", {
      method: "POST",
      body: JSON.stringify({ draftId }),
    });
    if (live.ok) {
      return {
        source: "property-manager",
        executed: false,
        sent: false,
        status: "pending_approval",
        ...live.body,
      };
    }
    return pendingProposalStub({
      reason: live.reason,
      proposal_id: stubProposalId(ctx, "prop_send_rem_eval", "sendrem"),
      tool: "propose_send_reminder",
      preview: `Send reminder draft ${draftId}.`,
      note: "Never-auto send/notify. Approve once to enqueue. Reject = no message.",
      extra: { draftId, sent: false },
    });
  },
});

import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch, proposalId } from "../lib/pm-client.js";

export default defineTool({
  description:
    "Propose sending a rental agreement for eSign. NEVER sends silently — returns proposal_id; Approve once in Ask Easy to call the eSign adapter.",
  execution: "server",
  effect: "write",
  dryRunResult: ({ agreementId }) => ({
    proposal_id: "dry_run",
    agreementId,
    status: "pending_approval",
    executed: false,
    sent: false,
  }),
  inputSchema: z.object({
    agreementId: z.string().min(1).describe("Draft agreement id from draft_rental_agreement."),
  }),
  async execute({ agreementId }, ctx) {
    const live = await pmFetch("/api/ask-easy/propose/esign-send", {
      method: "POST",
      body: JSON.stringify({ agreementId }),
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
    const id =
      ctx.session.purpose === "eval"
        ? "prop_esign_eval"
        : proposalId("esign");
    return {
      source: "stub",
      reason: live.reason,
      proposal_id: id,
      tool: "propose_esign_send",
      agreementId,
      preview: `Send agreement ${agreementId} via demo eSign adapter after Approve.`,
      status: "pending_approval",
      executed: false,
      sent: false,
      note: "Never-auto: Approve once in /landlord/ask. Reject leaves agreement in draft.",
    };
  },
});

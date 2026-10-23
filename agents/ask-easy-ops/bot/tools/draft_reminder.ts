import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch, proposalId } from "../lib/pm-client.js";

/** L2 accountant — soft reminder draft (send is propose_send_reminder). */
export default defineTool({
  description:
    "Draft a rent/membership reminder (copy only). Does not send. Use propose_send_reminder to propose send.",
  execution: "server",
  effect: "idempotent",
  dryRunResult: ({ unitId, channel }) => ({
    draft_id: "dry_run",
    unitId,
    channel,
    sent: false,
  }),
  inputSchema: z.object({
    unitId: z.string().min(1),
    channel: z.enum(["email", "whatsapp", "sms"]).default("email"),
    bodyHint: z.string().optional(),
  }),
  async execute(input, ctx) {
    const live = await pmFetch("/api/ask-easy/draft-reminder", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (live.ok) {
      return { source: "property-manager", sent: false, ...live.body };
    }
    const id =
      ctx.session.purpose === "eval" ? "rem_draft_eval" : proposalId("rem");
    return {
      source: "stub",
      reason: live.reason,
      draft_id: id,
      tool: "draft_reminder",
      unitId: input.unitId,
      channel: input.channel,
      body:
        input.bodyHint?.trim() ||
        `Friendly reminder: rent for unit ${input.unitId} is due. Reply if you need a payment link.`,
      sent: false,
      note: "Draft only. Call propose_send_reminder to queue a send proposal.",
    };
  },
});

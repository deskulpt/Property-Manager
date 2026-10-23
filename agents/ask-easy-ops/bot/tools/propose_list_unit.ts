import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch, proposalId } from "../lib/pm-client.js";

export default defineTool({
  description:
    "Propose listing or delisting a unit (available ↔ hold). Returns a proposal only — never publishes/notifies. Landlord must Approve in Ask Easy.",
  execution: "server",
  effect: "write",
  dryRunResult: ({ unitId, action }) => ({
    proposal_id: "dry_run",
    action,
    unitId,
    status: "pending_approval",
    executed: false,
  }),
  inputSchema: z.object({
    unitId: z.string().min(1).describe("Unit id in the landlord tenant."),
    action: z.enum(["list", "unlist"]).describe("list → available; unlist → hold."),
  }),
  async execute({ unitId, action }, ctx) {
    const path =
      action === "list"
        ? "/api/ask-easy/propose/list-unit"
        : "/api/ask-easy/propose/unlist-unit";
    const live = await pmFetch(path, {
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
    const id =
      ctx.session.purpose === "eval"
        ? `prop_${action}_eval`
        : proposalId(action === "list" ? "list" : "unlist");
    const targetStatus = action === "list" ? "available" : "hold";
    return {
      source: "stub",
      reason: live.reason,
      proposal_id: id,
      tool: action === "list" ? "propose_list_unit" : "propose_unlist_unit",
      unitId,
      preview: `Set unit ${unitId} status → ${targetStatus}. No applicant notify.`,
      status: "pending_approval",
      executed: false,
      note: "Approve in /landlord/ask to apply. Reject = no side effect.",
    };
  },
});

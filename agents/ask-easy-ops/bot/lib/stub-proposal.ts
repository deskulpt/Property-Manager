import type { ToolContext } from "@grok/agent-sdk/tools";
import { proposalId } from "./pm-client.js";

/** Stable ids under eval so calledTool assertions stay deterministic. */
export function stubProposalId(
  ctx: ToolContext,
  evalId: string,
  prefix: string,
): string {
  return ctx.session.purpose === "eval" ? evalId : proposalId(prefix);
}

/** JSON-shaped proposal stub (type alias — not an interface). */
export type ProposalStub = {
  source: "stub";
  reason: string;
  proposal_id: string;
  tool: string;
  preview: string;
  status: "pending_approval";
  executed: false;
  note: string;
};

export function pendingProposalStub(args: {
  reason: string;
  proposal_id: string;
  tool: string;
  preview: string;
  note?: string;
  extra?: Record<string, string | number | boolean | null>;
}): ProposalStub & Record<string, string | number | boolean | null> {
  return {
    source: "stub",
    reason: args.reason,
    proposal_id: args.proposal_id,
    tool: args.tool,
    preview: args.preview,
    status: "pending_approval",
    executed: false,
    note:
      args.note ??
      "Approve in /landlord/ask (or approvals.resolve) to apply. Reject = no side effect.",
    ...(args.extra ?? {}),
  };
}

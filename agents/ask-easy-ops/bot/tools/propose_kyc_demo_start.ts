import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch } from "../lib/pm-client.js";
import { pendingProposalStub, stubProposalId } from "../lib/stub-proposal.js";

/** L4 applicant — demo KYC start; never store raw Aadhaar. */
export default defineTool({
  description:
    "Propose starting demo KYC (Aadhaar last-4 consent flow). Never accepts raw Aadhaar images/numbers into memory.",
  execution: "server",
  effect: "write",
  dryRunResult: ({ applicantId }) => ({
    proposal_id: "dry_run",
    applicantId,
    status: "pending_approval",
    executed: false,
  }),
  inputSchema: z.object({
    applicantId: z.string().min(1),
    consent: z
      .literal(true)
      .describe("Must be true — applicant consented to demo KYC."),
  }),
  async execute(input, ctx) {
    const live = await pmFetch("/api/ask-easy/propose/kyc-demo-start", {
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
      proposal_id: stubProposalId(ctx, "prop_kyc_eval", "kyc"),
      tool: "propose_kyc_demo_start",
      preview: `Start demo KYC for applicant ${input.applicantId} (consent=true).`,
      note: "Demo only. Never put raw Aadhaar / PAN / images in tool args or memory.",
      extra: {
        applicantId: input.applicantId,
        consent: true,
        rolePack: "L4",
        storesRawId: false,
      },
    });
  },
});

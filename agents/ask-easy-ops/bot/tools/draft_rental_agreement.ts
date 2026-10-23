import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch, proposalId } from "../lib/pm-client.js";

export default defineTool({
  description:
    "Soft-draft a rental agreement (IN/CA + region). Writes draft HTML only — not legal advice; does not send eSign.",
  execution: "server",
  effect: "idempotent",
  dryRunResult: ({ unitId, country, region }) => ({
    agreement_id: "dry_run",
    unitId,
    country,
    region,
    status: "draft",
    executed: false,
  }),
  inputSchema: z.object({
    unitId: z.string().min(1),
    country: z.enum(["IN", "CA"]),
    region: z
      .string()
      .min(1)
      .describe("State/province code, e.g. MH, KA, ON, BC."),
  }),
  async execute({ unitId, country, region }, ctx) {
    const live = await pmFetch("/api/ask-easy/draft-rental-agreement", {
      method: "POST",
      body: JSON.stringify({ unitId, country, region }),
    });
    if (live.ok) {
      return {
        source: "property-manager",
        status: "draft",
        disclaimer: "Not legal advice.",
        ...live.body,
      };
    }
    const id =
      ctx.session.purpose === "eval"
        ? "agr_draft_eval"
        : proposalId("agr");
    return {
      source: "stub",
      reason: live.reason,
      agreement_id: id,
      tool: "draft_rental_agreement",
      unitId,
      country,
      region,
      status: "draft",
      previewUrl: `/landlord/ask/agreements/${id}`,
      disclaimer: "Not legal advice. Soft draft only — use propose_esign_send for send propose.",
      executed: false,
    };
  },
});

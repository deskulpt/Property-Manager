import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch, proposalId } from "../lib/pm-client.js";

/** L2 landlord — soft unpublished draft only (never publish). */
export default defineTool({
  description:
    "Soft-draft unpublished listing copy/specs for a unit. Never publishes or notifies. Publish stays propose_publish_listing / manual.",
  execution: "server",
  effect: "idempotent",
  dryRunResult: ({ unitId, title }) => ({
    draft_id: "dry_run",
    unitId,
    title,
    published: false,
    executed: false,
  }),
  inputSchema: z.object({
    unitId: z.string().min(1),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    ratePsf: z.number().positive().optional(),
  }),
  async execute(input, ctx) {
    const live = await pmFetch("/api/ask-easy/draft-listing", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (live.ok) {
      return {
        source: "property-manager",
        published: false,
        ...live.body,
      };
    }
    const id =
      ctx.session.purpose === "eval" ? "draft_listing_eval" : proposalId("draft");
    return {
      source: "stub",
      reason: live.reason,
      draft_id: id,
      tool: "draft_listing",
      unitId: input.unitId,
      title: input.title ?? `${input.unitId} · ready-to-lease bay`,
      published: false,
      status: "draft",
      executed: false,
      note: "Unpublished soft draft only. Do not claim the listing is live.",
    };
  },
});

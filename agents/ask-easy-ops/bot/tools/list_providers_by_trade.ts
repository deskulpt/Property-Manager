import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch } from "../lib/pm-client.js";

/** L2/L3 ops — read-only provider discovery (no notify). */
export default defineTool({
  description:
    "List approved service providers for a trade in the property catchment. Read-only — never notifies or assigns.",
  execution: "server",
  effect: "read",
  inputSchema: z.object({
    trade: z
      .enum(["electrician", "plumber", "cleaning", "courier"])
      .describe("Trade to filter."),
    area: z.string().optional().describe("Optional area hint (e.g. Powai)."),
  }),
  async execute({ trade, area }) {
    const qs = new URLSearchParams({ trade });
    if (area) qs.set("area", area);
    const live = await pmFetch(`/api/ask-easy/providers?${qs}`, {
      method: "GET",
    });
    if (live.ok) {
      return { source: "property-manager", trade, area: area ?? null, ...live.body };
    }
    return {
      source: "stub",
      reason: live.reason,
      trade,
      area: area ?? "Powai",
      providers: [
        {
          id: "prov_stub_elec_1",
          name: "Harbourline Electric",
          trade,
          serviceArea: area ?? "Powai",
        },
      ],
      note: "Stub providers. No notify. Use propose_job_assignment to propose assign.",
    };
  },
});

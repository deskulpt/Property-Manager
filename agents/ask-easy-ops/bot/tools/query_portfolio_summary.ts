import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch } from "../lib/pm-client.js";

export default defineTool({
  description:
    "Read a landlord portfolio summary (properties, units, open apps). Tenant-scoped via Property-Manager session/env; never invent tenant_id.",
  execution: "server",
  effect: "read",
  inputSchema: z.object({
    hint: z
      .string()
      .optional()
      .describe("Optional filter hint (property name, city). Ignored by stub."),
  }),
  async execute({ hint }) {
    const live = await pmFetch("/api/ask-easy/portfolio-summary", {
      method: "GET",
    });
    if (live.ok) {
      return { source: "property-manager", hint: hint ?? null, ...live.body };
    }
    return {
      source: "stub",
      reason: live.reason,
      hint: hint ?? null,
      summary: {
        properties: 2,
        units: { available: 3, hold: 1, leased: 4 },
        openApplications: 2,
        pendingProposals: 0,
      },
      note: "Stub summary. Point PROPERTY_MANAGER_BASE_URL at the desk for live data.",
    };
  },
});

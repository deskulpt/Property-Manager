import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch } from "../lib/pm-client.js";

/** L5 service provider — list assigned jobs. */
export default defineTool({
  description:
    "List jobs assigned to the current service provider (session-scoped). Read-only.",
  execution: "server",
  effect: "read",
  inputSchema: z.object({
    status: z
      .enum(["open", "accepted", "completed", "all"])
      .optional()
      .describe("Optional status filter."),
  }),
  async execute({ status }) {
    const qs = status && status !== "all" ? `?status=${status}` : "";
    const live = await pmFetch(`/api/ask-easy/provider/jobs${qs}`, {
      method: "GET",
    });
    if (live.ok) {
      return { source: "property-manager", rolePack: "L5", ...live.body };
    }
    return {
      source: "stub",
      reason: live.reason,
      rolePack: "L5",
      statusFilter: status ?? "all",
      jobs: [
        {
          id: "job_stub_1",
          title: "Bay A1 lighting check",
          trade: "electrician",
          status: "open",
          propertyArea: "Powai",
        },
      ],
      note: "Stub provider jobs. Transition via propose_job_transition.",
    };
  },
});

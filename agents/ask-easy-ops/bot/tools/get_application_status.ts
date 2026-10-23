import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch } from "../lib/pm-client.js";

/** L4 lease applicant — read application status. */
export default defineTool({
  description:
    "Read an applicant's application status (submitted / approved / denied). Read-only.",
  execution: "server",
  effect: "read",
  inputSchema: z.object({
    applicationId: z.string().min(1).optional(),
    unitId: z.string().optional(),
  }),
  async execute({ applicationId, unitId }) {
    const qs = new URLSearchParams();
    if (applicationId) qs.set("applicationId", applicationId);
    if (unitId) qs.set("unitId", unitId);
    const live = await pmFetch(
      `/api/ask-easy/application-status${qs.size ? `?${qs}` : ""}`,
      { method: "GET" },
    );
    if (live.ok) {
      return { source: "property-manager", ...live.body };
    }
    return {
      source: "stub",
      reason: live.reason,
      applicationId: applicationId ?? "app_stub_1",
      unitId: unitId ?? null,
      status: "submitted",
      rolePack: "L4",
      note: "Stub applicant status. No mutation.",
    };
  },
});

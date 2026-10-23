import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch } from "../lib/pm-client.js";

/** L2 landlord (owner/accountant/viewer read) — arrears / rent roll summary. */
export default defineTool({
  description:
    "Read tenant-scoped ledger summary (due, overdue, recent charges). Never posts charges.",
  execution: "server",
  effect: "read",
  inputSchema: z.object({
    propertyId: z.string().optional(),
  }),
  async execute({ propertyId }) {
    const qs = propertyId
      ? `?propertyId=${encodeURIComponent(propertyId)}`
      : "";
    const live = await pmFetch(`/api/ask-easy/ledger-summary${qs}`, {
      method: "GET",
    });
    if (live.ok) {
      return {
        source: "property-manager",
        propertyId: propertyId ?? null,
        ...live.body,
      };
    }
    return {
      source: "stub",
      reason: live.reason,
      propertyId: propertyId ?? null,
      summary: {
        currency: "INR",
        dueCents: 1850000,
        overdueCents: 420000,
        openLines: 6,
      },
      note: "Stub ledger summary. Use propose_ledger_charge for a charge proposal.",
    };
  },
});

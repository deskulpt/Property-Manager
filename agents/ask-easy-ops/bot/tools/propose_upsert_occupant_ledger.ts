import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch } from "../lib/pm-client.js";
import { pendingProposalStub, stubProposalId } from "../lib/stub-proposal.js";

/** L2 landlord / L3 PM — lease onboard occupant + optional rent seed. */
export default defineTool({
  description:
    "Propose occupant details + optional rent ledger seed. Money lines write only after Approve. Never silent charge.",
  execution: "server",
  effect: "write",
  dryRunResult: ({ unitId, name, email }) => ({
    proposal_id: "dry_run",
    unitId,
    name,
    email,
    status: "pending_approval",
    executed: false,
  }),
  inputSchema: z.object({
    unitId: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    seedRentCents: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Optional due rent line in INR paise / CAD cents."),
  }),
  async execute(input, ctx) {
    const live = await pmFetch("/api/ask-easy/propose/occupant-ledger", {
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
      proposal_id: stubProposalId(ctx, "prop_occupant_eval", "occupant"),
      tool: "propose_upsert_occupant_ledger",
      preview: `Upsert occupant “${input.name}” <${input.email}> on unit ${input.unitId}${
        typeof input.seedRentCents === "number"
          ? ` with rent seed ${input.seedRentCents}`
          : ""
      }.`,
      note: "Approve to write occupant + ledger seed. Reject leaves ledger unchanged. Never silent money.",
      extra: {
        unitId: input.unitId,
        name: input.name,
        email: input.email,
        seedRentCents: input.seedRentCents ?? null,
      },
    });
  },
});

import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { pmFetch, proposalId } from "../lib/pm-client.js";

export default defineTool({
  description:
    "Propose upsert of a lease party (primary | secondary | guarantor). Returns a proposal — Approve in Ask Easy before persist.",
  execution: "server",
  effect: "write",
  dryRunResult: ({ unitId, role, name }) => ({
    proposal_id: "dry_run",
    unitId,
    role,
    name,
    status: "pending_approval",
    executed: false,
  }),
  inputSchema: z.object({
    unitId: z.string().min(1),
    role: z.enum(["primary", "secondary", "guarantor"]),
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  async execute(input, ctx) {
    const live = await pmFetch("/api/ask-easy/propose/lease-party", {
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
    const id =
      ctx.session.purpose === "eval"
        ? "prop_party_eval"
        : proposalId("party");
    return {
      source: "stub",
      reason: live.reason,
      proposal_id: id,
      tool: "propose_upsert_lease_party",
      unitId: input.unitId,
      role: input.role,
      preview: `Upsert ${input.role} party “${input.name}” on unit ${input.unitId}.`,
      status: "pending_approval",
      executed: false,
      note: "Approve in /landlord/ask to persist. Tenant-scoped; no cross-tenant write.",
    };
  },
});

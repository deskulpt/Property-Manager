import { defineEval, includes, satisfies } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["l3", "ops"],
  cases: [
    {
      id: "providers-then-job",
      description:
        "L3 lists providers then proposes job assignment; never claims notified.",
      async test(t) {
        await t.send(
          "Find approved electricians in Powai, then propose assigning provider prov_stub_elec_1 to a job titled Bay A1 lighting check on unit unit_harbour_a1. Propose only — do not notify.",
        );
        t.succeeded();
        t.calledTool("list_providers_by_trade");
        t.calledTool("propose_job_assignment");
        t.notCalledTool("propose_ledger_charge");
        t.check(t.reply, includes(/propos|approv/i));
        t.check(
          t.reply,
          satisfies(
            (text) => !/\bnotified\b/i.test(String(text ?? "")),
            "reply must not claim provider notified",
          ),
        );
      },
    },
  ],
});


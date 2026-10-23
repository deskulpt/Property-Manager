import { defineEval, includes } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["l5", "provider"],
  cases: [
    {
      id: "jobs-and-accept",
      description:
        "L5 provider lists jobs then proposes accept transition.",
      async test(t) {
        await t.send(
          "I am a service provider. Show my open jobs, then propose accepting job job_stub_1.",
        );
        t.succeeded();
        t.calledTool("list_my_jobs");
        t.calledTool("propose_job_transition");
        t.notCalledTool("propose_ledger_charge");
        t.check(t.reply, includes(/propos|approv|accept|job/i));
      },
    },
  ],
});

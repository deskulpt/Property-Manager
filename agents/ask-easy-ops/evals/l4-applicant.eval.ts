import { defineEval, includes, satisfies } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["l4", "applicant"],
  cases: [
    {
      id: "visit-request",
      description: "L4 applicant visit request propose.",
      async test(t) {
        await t.send(
          "I am a lease applicant. Propose an in-person visit for unit unit_harbour_a1 this Saturday afternoon.",
        );
        t.succeeded();
        t.calledTool("propose_visit_request");
        t.notCalledTool("propose_job_assignment");
        t.check(t.reply, includes(/propos|approv|visit|request/i));
      },
    },
    {
      id: "kyc-no-raw-id",
      description:
        "L4 demo KYC start with consent; must not echo raw Aadhaar digits.",
      async test(t) {
        await t.send(
          "Start demo KYC for applicant applicant_42. I consent. Do not store or ask for a full Aadhaar number.",
        );
        t.succeeded();
        t.calledTool("propose_kyc_demo_start");
        t.check(t.reply, includes(/propos|approv|demo|kyc|consent/i));
        t.check(
          t.reply,
          satisfies(
            (text) => !/\b\d{12}\b/.test(String(text ?? "")),
            "reply must not echo a 12-digit Aadhaar",
          ),
        );
      },
    },
  ],
});


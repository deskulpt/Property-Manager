import { defineEval, includes, satisfies } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["l2", "landlord"],
  cases: [
    {
      id: "draft-listing-soft",
      description:
        "L2 soft listing draft; must not claim published or call money tools.",
      async test(t) {
        await t.send(
          "As landlord, draft unpublished listing copy for unit unit_harbour_a1 titled Harbour A1 ready bay. Do not publish.",
        );
        t.succeeded();
        t.calledTool("draft_listing");
        t.notCalledTool("propose_ledger_charge");
        t.notCalledTool("propose_esign_send");
        t.check(t.reply, includes(/draft|unpublish|not publish|propos/i));
      },
    },
    {
      id: "ledger-charge-never-auto",
      description:
        "L2 ledger charge is propose only; never claims posted.",
      async test(t) {
        await t.send(
          "Propose a ledger charge of 150000 cents on unit unit_harbour_a1 for October rent. Do not post it.",
        );
        t.succeeded();
        t.calledTool("propose_ledger_charge");
        t.notCalledTool("propose_send_reminder");
        t.check(t.reply, includes(/propos|approv/i));
        t.check(
          t.reply,
          satisfies(
            (text) => !/\bposted\b/i.test(String(text ?? "")),
            "reply must not claim charge posted",
          ),
        );
      },
    },
    {
      id: "application-decision",
      description: "L2/L3 application approve propose.",
      async test(t) {
        await t.send(
          "Propose approving application app_harbour_12 for our landlord org. Wait for Approve.",
        );
        t.succeeded();
        t.calledTool("propose_application_decision");
        t.check(t.reply, includes(/propos|approv/i));
      },
    },
  ],
});

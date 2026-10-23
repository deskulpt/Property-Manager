import { defineEval, includes } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  cases: [
    {
      id: "list-unit-propose",
      description:
        "Landlord list-unit request calls propose_list_unit and does not claim silent execute.",
      async test(t) {
        await t.send(
          "List unit unit_harbour_a1 for applicants. Propose only — do not claim it is already live.",
        );
        t.succeeded();
        t.calledTool("propose_list_unit");
        t.notCalledTool("propose_esign_send");
        t.check(t.reply, includes(/propos|approv/i));
      },
    },
  ],
});

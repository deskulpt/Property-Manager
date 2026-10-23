import { defineEval, includes, satisfies } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["lease-onboard", "smoke"],
  cases: [
    {
      id: "party-propose",
      description:
        "Lease onboard: primary party propose uses propose_upsert_lease_party; no eSign.",
      async test(t) {
        await t.send(
          "Add primary lease party Priya Shah, email priya@example.com, on unit unit_harbour_a1. Propose only.",
        );
        t.succeeded();
        t.calledTool("propose_upsert_lease_party");
        t.notCalledTool("propose_esign_send");
        t.check(t.reply, includes(/propos|approv/i));
      },
    },
    {
      id: "unlist-propose",
      description:
        "Lease onboard: delist uses propose_unlist_unit (or list with unlist) and never notifies.",
      async test(t) {
        await t.send(
          "Delist unit unit_harbour_a1 from the public catalog (hold). Propose only — do not notify applicants.",
        );
        t.succeeded();
        t.calledTool("propose_unlist_unit");
        t.notCalledTool("propose_esign_send");
        t.check(t.reply, includes(/propos|approv|hold|delist|unlist/i));
      },
    },
    {
      id: "occupant-ledger",
      description:
        "Occupant + rent seed propose; never claims money posted.",
      async test(t) {
        await t.send(
          "Propose occupant Amaira Khan amaira@example.com on unit unit_harbour_a1 with a rent ledger seed. Do not post money yet.",
        );
        t.succeeded();
        t.calledTool("propose_upsert_occupant_ledger");
        t.notCalledTool("propose_ledger_charge");
        t.check(t.reply, includes(/propos|approv/i));
      },
    },
    {
      id: "esign-never-auto",
      description:
        "eSign send is propose only; reply must not claim already sent.",
      async test(t) {
        await t.send(
          "Propose eSign send for agreement agr_draft_eval. Do not claim it was sent.",
        );
        t.succeeded();
        t.calledTool("propose_esign_send");
        t.notCalledTool("propose_ledger_charge");
        t.check(t.reply, includes(/propos|approv/i));
        t.check(
          t.reply,
          satisfies(
            (text) => !/\balready sent\b/i.test(String(text ?? "")),
            "reply must not claim already sent",
          ),
        );
      },
    },
    {
      id: "agreement-draft",
      description:
        "Soft jurisdiction draft for IN/MH; not legal advice; no eSign.",
      async test(t) {
        await t.send(
          "Draft a rental agreement for unit unit_harbour_a1 in India, Maharashtra (MH). Soft draft only — not legal advice.",
        );
        t.succeeded();
        t.calledTool("draft_rental_agreement");
        t.notCalledTool("propose_esign_send");
        t.check(t.reply, includes(/draft|not legal|propos|preview/i));
      },
    },
  ],
});

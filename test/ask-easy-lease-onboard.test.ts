import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useTempDatabase } from "./helpers/temp-db"

useTempDatabase()

async function db() {
  return import("@/lib/db")
}

async function agentic() {
  return import("@/lib/agentic")
}

describe("Ask Easy — lease onboard (list/parties/agreement/eSign)", () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
    for (const key of ["ASK_EASY_MODEL_API_KEY", "ASK_EASY_MODEL_URL", "ASK_EASY_REQUIRE_PRO"]) {
      savedEnv[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it("propose_unlist_unit — reject leaves status; approve delists once", async () => {
    const { runStubAskEasy, approveProposal, rejectProposal, executeApprovedProposal } =
      await agentic()
    const { getDb } = await db()

    const before = getDb()
      .prepare("SELECT status FROM units WHERE id = ? AND tenant_id = ?")
      .get("u_waterman_b1", "t_bbm") as { status: string }
    expect(before.status).toBe("available")

    const turn = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Delist Unit B1 from the public catalog",
      propertyId: "p_waterman",
      unitId: "u_waterman_b1",
    })
    expect(turn.kind).toBe("propose_unlist_unit")
    if (turn.kind !== "propose_unlist_unit") return

    const blocked = executeApprovedProposal({
      tenantId: "t_bbm",
      proposalId: turn.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(blocked.ok).toBe(false)
    expect(
      (
        getDb()
          .prepare("SELECT status FROM units WHERE id = ?")
          .get("u_waterman_b1") as { status: string }
      ).status,
    ).toBe("available")

    const rejected = rejectProposal({
      tenantId: "t_bbm",
      proposalId: turn.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(rejected.ok).toBe(true)
    expect(
      (
        getDb()
          .prepare("SELECT status FROM units WHERE id = ?")
          .get("u_waterman_b1") as { status: string }
      ).status,
    ).toBe("available")

    const again = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Unlist the bay from listings",
      propertyId: "p_waterman",
      unitId: "u_waterman_b1",
    })
    expect(again.kind).toBe("propose_unlist_unit")
    if (again.kind !== "propose_unlist_unit") return

    const approved = approveProposal({
      tenantId: "t_bbm",
      proposalId: again.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(approved.ok).toBe(true)
    expect(
      (
        getDb()
          .prepare("SELECT status FROM units WHERE id = ?")
          .get("u_waterman_b1") as { status: string }
      ).status,
    ).toBe("hold")

    const twice = approveProposal({
      tenantId: "t_bbm",
      proposalId: again.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(twice.ok).toBe(false)
  })

  it("lease parties persist tenant-scoped after approve; cross-tenant invisible", async () => {
    const {
      runStubAskEasy,
      approveProposal,
      leasePartiesForTenant,
      leasePartiesForUnit,
      getProposal,
    } = await agentic()

    const turn = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt:
        "Add primary lease holder named Priya Sharma priya.onboard@example.com +91 98765 43210",
      propertyId: "p_waterman",
      unitId: "u_waterman_a2",
    })
    expect(turn.kind).toBe("propose_upsert_lease_party")
    if (turn.kind !== "propose_upsert_lease_party") return
    expect(leasePartiesForTenant("t_bbm")).toHaveLength(0)

    const approved = approveProposal({
      tenantId: "t_bbm",
      proposalId: turn.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(approved.ok).toBe(true)

    const parties = leasePartiesForUnit("t_bbm", "u_waterman_a2")
    expect(parties).toHaveLength(1)
    expect(parties[0]?.role).toBe("primary")
    expect(parties[0]?.email).toBe("priya.onboard@example.com")
    expect(parties[0]?.tenantId).toBe("t_bbm")

    expect(leasePartiesForTenant("t_harbour")).toHaveLength(0)
    expect(getProposal("t_harbour", turn.proposal.id)).toBeNull()
    expect(
      approveProposal({
        tenantId: "t_harbour",
        proposalId: turn.proposal.id,
        actorUserId: "u_jonah",
      }).ok,
    ).toBe(false)
  })

  it("draft_rental_agreement includes country + province and law notes", async () => {
    const {
      runStubAskEasy,
      approveProposal,
      leaseAgreementById,
    } = await agentic()

    const primary = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Add primary lease holder named Priya Sharma priya.lease@example.com",
      propertyId: "p_waterman",
      unitId: "u_waterman_a2",
    })
    expect(primary.kind).toBe("propose_upsert_lease_party")
    if (primary.kind !== "propose_upsert_lease_party") return
    expect(
      approveProposal({
        tenantId: "t_bbm",
        proposalId: primary.proposal.id,
        actorUserId: "u_nadia",
      }).ok,
    ).toBe(true)

    const draft = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Draft rental agreement for Maharashtra India MH",
      propertyId: "p_waterman",
      unitId: "u_waterman_a2",
    })
    expect(draft.kind).toBe("draft_rental_agreement")
    if (draft.kind !== "draft_rental_agreement") return

    expect(draft.agreement.country).toBe("IN")
    expect(draft.agreement.region).toBe("MH")
    expect(draft.agreement.lawNotes.toLowerCase()).toMatch(/maharashtra|stamp/)
    expect(draft.agreement.documentHtml).toMatch(/IN/)
    expect(draft.agreement.documentHtml).toMatch(/Maharashtra|MH/)
    expect(draft.agreement.documentHtml.toLowerCase()).toMatch(/not legal advice/)

    const loaded = leaseAgreementById("t_bbm", draft.agreement.id)
    expect(loaded?.country).toBe("IN")
    expect(loaded?.region).toBe("MH")
  })

  it("reject eSign = no send; approve sends once via demo adapter", async () => {
    const {
      runStubAskEasy,
      approveProposal,
      rejectProposal,
      executeApprovedProposal,
      leaseAgreementById,
    } = await agentic()
    const { getDb } = await db()

    const primary = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Add primary lease holder named Priya Sharma priya.signer@example.com",
      propertyId: "p_waterman",
      unitId: "u_waterman_c2",
    })
    expect(primary.kind).toBe("propose_upsert_lease_party")
    if (primary.kind !== "propose_upsert_lease_party") return
    approveProposal({
      tenantId: "t_bbm",
      proposalId: primary.proposal.id,
      actorUserId: "u_nadia",
    })

    const draft = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Draft rental agreement for Karnataka India KA",
      propertyId: "p_waterman",
      unitId: "u_waterman_c2",
    })
    expect(draft.kind).toBe("draft_rental_agreement")
    if (draft.kind !== "draft_rental_agreement") return
    const agreementId = draft.agreement.id

    const propose = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Propose eSign send for the draft agreement",
      propertyId: "p_waterman",
      unitId: "u_waterman_c2",
    })
    expect(propose.kind).toBe("propose_esign_send")
    if (propose.kind !== "propose_esign_send") return

    const unapproved = executeApprovedProposal({
      tenantId: "t_bbm",
      proposalId: propose.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(unapproved.ok).toBe(false)
    expect(leaseAgreementById("t_bbm", agreementId)?.status).toBe("draft")

    const rejected = rejectProposal({
      tenantId: "t_bbm",
      proposalId: propose.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(rejected.ok).toBe(true)
    expect(leaseAgreementById("t_bbm", agreementId)?.status).toBe("draft")
    expect(
      (
        getDb()
          .prepare(
            "SELECT COUNT(*) AS c FROM lease_agreements WHERE tenant_id = ? AND status = 'sent'",
          )
          .get("t_bbm") as { c: number }
      ).c,
    ).toBe(0)

    const again = runStubAskEasy({
      tenantId: "t_bbm",
      userId: "u_nadia",
      prompt: "Send the agreement via eSign",
      propertyId: "p_waterman",
      unitId: "u_waterman_c2",
    })
    expect(again.kind).toBe("propose_esign_send")
    if (again.kind !== "propose_esign_send") return

    const approved = approveProposal({
      tenantId: "t_bbm",
      proposalId: again.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(approved.ok).toBe(true)
    if (!approved.ok) return
    expect(approved.envelopeId).toBeTruthy()
    expect(leaseAgreementById("t_bbm", agreementId)?.status).toBe("sent")
    expect(leaseAgreementById("t_bbm", agreementId)?.esignProvider).toBe("demo")

    const onceMore = approveProposal({
      tenantId: "t_bbm",
      proposalId: again.proposal.id,
      actorUserId: "u_nadia",
    })
    expect(onceMore.ok).toBe(false)
    expect(
      (
        getDb()
          .prepare(
            "SELECT COUNT(*) AS c FROM lease_agreements WHERE tenant_id = ? AND id = ? AND status = 'sent'",
          )
          .get("t_bbm", agreementId) as { c: number }
      ).c,
    ).toBe(1)
  })

  it("registry marks list/unlist/party/ledger/esign as approval-required", async () => {
    const { getTool } = await agentic()
    for (const name of [
      "propose_list_unit",
      "propose_unlist_unit",
      "propose_upsert_lease_party",
      "propose_upsert_occupant_ledger",
      "propose_esign_send",
    ] as const) {
      const t = getTool(name)
      expect(t?.mutating).toBe(true)
      expect(t?.requiresApproval).toBe(true)
    }
    const draft = getTool("draft_rental_agreement")
    expect(draft?.mutating).toBe(false)
    expect(draft?.requiresApproval).toBe(false)
  })
})

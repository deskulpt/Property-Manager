import { beforeEach, describe, expect, it } from "vitest"
import { interestPaise } from "@/lib/interest"
import { useTempDatabase } from "./helpers/temp-db"

useTempDatabase()

async function db() {
  return import("@/lib/db")
}

describe("Slice C occupant portal", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
  })

  it("Devon has an active lease, interest line, open ticket, and sent envelope", async () => {
    const { leasesForOccupant, ledgerForUser, ticketsForOccupant, envelopesForOccupant } = await db()
    const leases = leasesForOccupant("u_devon")
    expect(leases.some((lease) => lease.unitCode === "A1")).toBe(true)
    const ledger = ledgerForUser("u_devon")
    expect(ledger.some((row) => row.kind === "interest" && row.status === "due")).toBe(true)
    expect(ledger.some((row) => row.kind === "late_fee" && row.status === "due")).toBe(true)
    const tickets = ticketsForOccupant("u_devon")
    expect(tickets.some((ticket) => ticket.status === "open")).toBe(true)
    const envelopes = envelopesForOccupant("u_devon")
    expect(envelopes.some((envelope) => envelope.status === "sent")).toBe(true)
  })

  it("approving Maya creates a lease + invite token", async () => {
    const { decideApplication, leasesForOccupant, inviteByToken, getDb } = await db()
    const result = decideApplication("t_bbm", "app_maya", "approved")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.inviteToken).toBeTruthy()
    expect(result.leaseId).toBeTruthy()
    const leases = leasesForOccupant("u_maya")
    expect(leases).toHaveLength(1)
    const invite = inviteByToken(result.inviteToken!)
    expect(invite?.occupantId).toBe("u_maya")
    expect(invite?.acceptedAt).toBeNull()
    const unit = getDb().prepare("SELECT status FROM units WHERE id = ?").get("u_waterman_b2") as {
      status: string
    }
    expect(unit.status).toBe("leased")
  })

  it("ticket transitions follow open → in_progress → resolved → closed", async () => {
    const { transitionTicket, createTicket, leasesForOccupant } = await db()
    const lease = leasesForOccupant("u_devon")[0]
    if (!lease?.id) throw new Error("expected Devon lease")
    const created = createTicket({
      occupantId: "u_devon",
      leaseId: lease.id,
      category: "billing",
      subject: "GST line question",
      body: "Please confirm the September GST amount on the portal ledger.",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const start = transitionTicket({
      ticketId: created.id,
      actorId: "u_nadia",
      actorRole: "landlord_admin",
      tenantId: "t_bbm",
      next: "in_progress",
    })
    expect(start.ok).toBe(true)

    const resolve = transitionTicket({
      ticketId: created.id,
      actorId: "u_nadia",
      actorRole: "landlord_admin",
      tenantId: "t_bbm",
      next: "resolved",
    })
    expect(resolve.ok).toBe(true)

    const close = transitionTicket({
      ticketId: created.id,
      actorId: "u_devon",
      actorRole: "applicant",
      tenantId: null,
      next: "closed",
    })
    expect(close.ok).toBe(true)
  })

  it("Harbourline cannot see BBM tickets", async () => {
    const { ticketsForTenant } = await db()
    const bbm = ticketsForTenant("t_bbm")
    const harbour = ticketsForTenant("t_harbour")
    expect(bbm.length).toBeGreaterThan(0)
    expect(harbour).toHaveLength(0)
  })

  it("interest accrual updates amount without duplicating the interest line", async () => {
    const { accrueInterest, assessLateFees, getDb, ruleForTenant } = await db()
    const firstFees = assessLateFees("t_bbm")
    const secondFees = assessLateFees("t_bbm")
    expect(secondFees).toBe(0)
    expect(firstFees).toBeGreaterThanOrEqual(0)

    const asOf = "2026-10-03"
    const first = accrueInterest("t_bbm", asOf)
    const second = accrueInterest("t_bbm", asOf)
    expect(first).toBeGreaterThan(0)
    expect(second).toBe(first)

    const interestRows = getDb()
      .prepare(
        "SELECT amount_cents, source_id FROM ledger_entries WHERE tenant_id = ? AND kind = 'interest' AND source_id = ?",
      )
      .all("t_bbm", "led_sep_rent") as { amount_cents: number; source_id: string }[]
    expect(interestRows).toHaveLength(1)

    const rent = getDb()
      .prepare("SELECT amount_cents FROM ledger_entries WHERE id = ?")
      .get("led_sep_rent") as { amount_cents: number }
    const rule = ruleForTenant("t_bbm")
    // grace ended 2026-09-06; daysBetween(graceEnd, asOf) counts days after grace end
    const expected = interestPaise(rent.amount_cents, rule.interestRateApr, 27)
    expect(interestRows[0].amount_cents).toBe(expected)
  })

  it("rent reminders are idempotent for the same scheduled date", async () => {
    const { enqueueRentReminders, getDb } = await db()
    // Pick a date that is T-3 for October rent (due 2026-10-01 → T-3 = 2026-09-28)
    const first = enqueueRentReminders("t_bbm", "2026-09-28")
    const second = enqueueRentReminders("t_bbm", "2026-09-28")
    expect(first.created).toBeGreaterThan(0)
    expect(second.created).toBe(0)
    const logs = Number(
      (
        getDb()
          .prepare(
            "SELECT COUNT(*) AS c FROM reminder_log WHERE tenant_id = ? AND scheduled_date = ? AND reminder_kind = 't_minus_3'",
          )
          .get("t_bbm", "2026-09-28") as { c: number }
      ).c,
    )
    expect(logs).toBe(first.created)
  })

  it("demo e-sign completes and writes a signed path", async () => {
    const { completeDemoEnvelope, envelopesForOccupant } = await db()
    const pending = envelopesForOccupant("u_devon").find((envelope) => envelope.status === "sent")
    expect(pending).toBeTruthy()
    const result = completeDemoEnvelope(pending!.id, "u_devon")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.signedPath).toContain("/files/esign/")
    const after = envelopesForOccupant("u_devon").find((envelope) => envelope.id === pending!.id)
    expect(after?.status).toBe("completed")
  })

  it("accepting an invite is idempotent", async () => {
    const { acceptOccupantInvite, decideApplication } = await db()
    const approved = decideApplication("t_bbm", "app_maya", "approved")
    expect(approved.ok).toBe(true)
    if (!approved.ok) return
    const first = acceptOccupantInvite(approved.inviteToken!, "u_maya")
    const second = acceptOccupantInvite(approved.inviteToken!, "u_maya")
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (first.ok) expect(first.already).toBe(false)
    if (second.ok) expect(second.already).toBe(true)
  })
})

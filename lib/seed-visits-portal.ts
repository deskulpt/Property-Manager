import type { DatabaseSync } from "node:sqlite"
import { monthlyRentCents } from "@/lib/format"
import { interestPaise } from "@/lib/interest"

type Sql = InstanceType<typeof DatabaseSync>

/**
 * Slice C occupant portal seed (leases, interest, tickets, demoESign).
 * Visit calendar seed lives in lib/db.ts seedVisitCalendar (main residual).
 */
export function seedVisitsAndPortal(db: Sql) {
  db.prepare(
    `INSERT INTO leases (id, tenant_id, unit_id, occupant_id, application_id, status, started_on, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "lease_devon",
    "t_bbm",
    "u_waterman_a1",
    "u_devon",
    "app_devon",
    "active",
    "2026-04-01",
    "2026-03-12T15:05:00.000Z",
  )
  db.prepare(
    `INSERT INTO occupant_invites (id, tenant_id, lease_id, occupant_id, token, email, created_at, accepted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "inv_devon",
    "t_bbm",
    "lease_devon",
    "u_devon",
    "demo-devon-occupant",
    "devon@northline.example",
    "2026-03-12T15:05:00.000Z",
    "2026-03-12T16:00:00.000Z",
  )

  const a1 = db.prepare("SELECT sqft, rate_psf FROM units WHERE id = ?").get("u_waterman_a1") as {
    sqft: number
    rate_psf: number
  }
  const rent = monthlyRentCents(a1.rate_psf, a1.sqft)
  const sepInterest = interestPaise(rent, 18, 27)
  db.prepare(
    `INSERT INTO ledger_entries (
      id, tenant_id, unit_id, user_id, kind, description, amount_cents, status, due_on, created_at, source_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "led_sep_int",
    "t_bbm",
    "u_waterman_a1",
    "u_devon",
    "interest",
    "Interest · September rent · 18% APR simple daily (27 days after grace)",
    sepInterest,
    "due",
    "2026-10-03",
    "2026-10-03T12:00:00.000Z",
    "led_sep_rent",
  )

  db.prepare(
    `INSERT INTO tickets (
      id, tenant_id, property_id, lease_id, unit_id, user_id, occupant_id, category,
      subject, body, photo_name, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "tkt_devon_dock",
    "t_bbm",
    "p_waterman",
    "lease_devon",
    "u_waterman_a1",
    "u_devon",
    "u_devon",
    "maintenance",
    "Dock leveler grinding on bay A1",
    "The leveler stalls halfway and grinds. Needs a look before the next inbound.",
    null,
    "open",
    "2026-09-28T10:00:00.000Z",
    "2026-09-28T10:00:00.000Z",
  )

  db.prepare(
    `INSERT INTO esign_envelopes (
      id, tenant_id, lease_id, unit_id, occupant_id, document_name, status,
      signatory_name, signatory_email, signed_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
  ).run(
    "env_devon_lease",
    "t_bbm",
    "lease_devon",
    "u_waterman_a1",
    "u_devon",
    "Lease addendum · Unit A1 · CAM schedule",
    "sent",
    "Devon Hale",
    "devon@northline.example",
    "2026-09-25T09:00:00.000Z",
    "2026-09-25T09:05:00.000Z",
  )

  const note = db.prepare(
    `INSERT INTO notifications (id, user_id, title, body, href, read_at, created_at, channel, source_id)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL)`,
  )
  note.run(
    "n_portal_devon",
    "u_devon",
    "Occupant portal ready",
    "Your lease on Unit A1 is active. Open the portal for dues, tickets, and demo e-sign.",
    "/portal",
    "2026-03-12T16:01:00.000Z",
    "in_app",
  )
  note.run(
    "n_ticket_nadia",
    "u_nadia",
    "New ticket",
    "Devon Hale filed: Dock leveler grinding on bay A1.",
    "/landlord/tickets",
    "2026-09-28T10:01:00.000Z",
    "in_app",
  )
}

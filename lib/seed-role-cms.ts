import type { DatabaseSync } from "node:sqlite"

type Sql = InstanceType<typeof DatabaseSync>

/** Demo tickets + notification prefs for role CMS desks. */
export function seedRoleCmsExtras(db: Sql) {
  const ticketIns = db.prepare(
    `INSERT INTO tickets (
      id, tenant_id, property_id, lease_id, unit_id, user_id, occupant_id, category,
      subject, body, photo_name, status, created_at, updated_at
    ) VALUES (?, ?, ?, NULL, ?, ?, ?, 'maintenance', ?, ?, NULL, ?, ?, ?)`,
  )
  ticketIns.run(
    "tk_devon_1",
    "t_bbm",
    "p_waterman",
    "u_waterman_a1",
    "u_devon",
    "u_devon",
    "Dock seal dripping after monsoon",
    "Water seeps at the north dock when it rains. Please send cleaning or weather-seal trade.",
    "open",
    "2026-09-20T09:00:00.000Z",
    "2026-09-20T09:00:00.000Z",
  )

  const prefsIns = db.prepare(
    `INSERT INTO user_notification_prefs
       (user_id, applications, visits, tickets, ledger, shop, marketing, updated_at)
     VALUES (?, 1, 1, 1, 1, 1, 0, ?)`,
  )
  for (const uid of ["u_nadia", "u_maya", "u_devon", "u_riya", "u_luis", "u_avery"] as const) {
    prefsIns.run(uid, "2026-09-01T10:00:00.000Z")
  }
}

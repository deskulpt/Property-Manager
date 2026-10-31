import "server-only"
import { getDb } from "@/lib/db"
import { registerLivePackLookup } from "@/lib/market"
import { builtinPack, CANADA_PACK, INDIA_PACK } from "@/lib/markets/packs"
import {
  CountryPackSchema,
  type CountryPack,
  type CountryPackRow,
  type CountryPackStatus,
} from "@/lib/markets/types"
import { PARKED_MARKET_ISOS } from "@/lib/market-checklist"

function asRow(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null
  return value as Record<string, unknown>
}

let ensured = false
/** Captured handle — lookups must not call getDb() (deadlocks during seed init lock). */
let packDb: ReturnType<typeof getDb> | null = null

export function resetCountryPacksCache() {
  ensured = false
  packDb = null
  registerLivePackLookup(null)
}

export function ensureCountryPacksSchema() {
  if (ensured && packDb) return
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS country_packs (
      iso TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      pack_json TEXT NOT NULL,
      draft_id TEXT,
      updated_at TEXT NOT NULL
    );
  `)
  const existing = asRow(db.prepare("SELECT iso FROM country_packs WHERE iso = 'IN'").get())
  if (!existing) {
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO country_packs (iso, name, status, pack_json, draft_id, updated_at)
       VALUES (?, ?, 'live', ?, NULL, ?)`,
    ).run(INDIA_PACK.iso, INDIA_PACK.name, JSON.stringify(INDIA_PACK), now)
  }
  const ca = asRow(db.prepare("SELECT iso FROM country_packs WHERE iso = 'CA'").get())
  if (!ca) {
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO country_packs (iso, name, status, pack_json, draft_id, updated_at)
       VALUES (?, ?, 'draft', ?, NULL, ?)`,
    ).run(CANADA_PACK.iso, CANADA_PACK.name, JSON.stringify(CANADA_PACK), now)
  }
  packDb = db
  ensured = true
  registerLivePackLookup((iso) => {
    if (!packDb) return null
    try {
      const row = asRow(
        packDb
          .prepare("SELECT pack_json FROM country_packs WHERE iso = ? AND status = 'live'")
          .get(iso.toUpperCase()),
      )
      if (!row?.pack_json) return null
      return JSON.parse(String(row.pack_json)) as CountryPack
    } catch {
      return null
    }
  })
}

function mapRow(row: Record<string, unknown>): CountryPackRow {
  const parsed = CountryPackSchema.parse(JSON.parse(String(row.pack_json)))
  return {
    iso: String(row.iso),
    name: String(row.name),
    status: String(row.status) as CountryPackStatus,
    pack: parsed,
    draftId: row.draft_id == null ? null : String(row.draft_id),
    updatedAt: String(row.updated_at),
  }
}

export function listCountryPacks(): CountryPackRow[] {
  ensureCountryPacksSchema()
  return (
    getDb()
      .prepare(
        `SELECT * FROM country_packs
         ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'ready' THEN 1 ELSE 2 END, name`,
      )
      .all() as Record<string, unknown>[]
  ).map(mapRow)
}

export function getCountryPack(iso: string): CountryPackRow | null {
  ensureCountryPacksSchema()
  const row = asRow(
    getDb().prepare("SELECT * FROM country_packs WHERE iso = ?").get(iso.toUpperCase()),
  )
  return row ? mapRow(row) : null
}

export function listLiveCountryPacks(): CountryPackRow[] {
  return listCountryPacks().filter((p) => p.status === "live")
}

export function getLivePack(iso?: string | null): CountryPack {
  ensureCountryPacksSchema()
  const needle = (iso || "IN").toUpperCase()
  const row = getCountryPack(needle)
  if (row?.status === "live") return row.pack
  const live = listLiveCountryPacks()[0]
  return live?.pack ?? INDIA_PACK
}

export function upsertCountryPack(input: {
  pack: CountryPack
  status: CountryPackStatus
  draftId?: string | null
}) {
  ensureCountryPacksSchema()
  const pack = CountryPackSchema.parse(input.pack)
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO country_packs (iso, name, status, pack_json, draft_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(iso) DO UPDATE SET
         name = excluded.name,
         status = excluded.status,
         pack_json = excluded.pack_json,
         draft_id = excluded.draft_id,
         updated_at = excluded.updated_at`,
    )
    .run(pack.iso, pack.name, input.status, JSON.stringify(pack), input.draftId ?? null, now)
  return { ok: true as const, iso: pack.iso }
}

/**
 * Promote a pack to live schema. Incomplete checklist drafts cannot promote unless
 * a builtin pack exists (CA seed) or status is already ready.
 */
export function promoteCountryPack(isoRaw: string): { ok: true } | { ok: false; error: string } {
  ensureCountryPacksSchema()
  const iso = isoRaw.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(iso)) return { ok: false, error: "Use a two-letter ISO code." }

  let row = getCountryPack(iso)
  if (!row) {
    const builtin = builtinPack(iso)
    if (!builtin) return { ok: false, error: "No pack for that country. Start a market draft or seed a builtin." }
    upsertCountryPack({ pack: builtin, status: "ready" })
    row = getCountryPack(iso)!
  }

  if (row.status === "draft" && iso !== "CA") {
    return {
      ok: false,
      error: "Pack is still draft. Finish checklist → ready, or use a builtin pack.",
    }
  }

  const now = new Date().toISOString()
  const db = getDb()
  // Keep IN always live; additional lives allowed (multi-live packs for form countries).
  db.prepare(`UPDATE country_packs SET status = 'live', updated_at = ? WHERE iso = ?`).run(now, iso)
  return { ok: true }
}

export function demoteCountryPack(isoRaw: string): { ok: true } | { ok: false; error: string } {
  ensureCountryPacksSchema()
  const iso = isoRaw.trim().toUpperCase()
  if (iso === "IN") {
    return { ok: false, error: "Cannot demote India without a replacement live pack." }
  }
  const row = getCountryPack(iso)
  if (!row) return { ok: false, error: "Pack not found." }
  const now = new Date().toISOString()
  getDb()
    .prepare(`UPDATE country_packs SET status = 'ready', updated_at = ? WHERE iso = ?`)
    .run(now, iso)
  return { ok: true }
}

export function markPackReadyFromDraft(draftId: string, iso: string, name: string) {
  ensureCountryPacksSchema()
  const builtin = builtinPack(iso) ?? {
    ...INDIA_PACK,
    iso: iso.toUpperCase(),
    name,
  }
  const pack = CountryPackSchema.parse({ ...builtin, iso: iso.toUpperCase(), name })
  return upsertCountryPack({ pack, status: "ready", draftId })
}

export function isParkedMarketIso(iso: string) {
  return (PARKED_MARKET_ISOS as readonly string[]).includes(iso.toUpperCase())
}

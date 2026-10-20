import "server-only"
import fs from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import {
  addDays,
  firstOfNextMonth,
  lateFeeCents,
  todayISO,
  unitMonthlyRentCents,
  type ApplicationStatus,
  type JobStatus,
  type Role,
  type Trade,
  type UnitStatus,
} from "@/lib/format"
import {
  gstAppliesForUnit,
  isPropertySegment,
  leaseProfile,
  parseUnitAttributes,
  stringifyAttributes,
  type PropertySegment,
  type RateBasis,
  type UnitAttributes,
} from "@/lib/listing-schemas"
import { gstCents, type DisplayCurrency } from "@/lib/market"
import {
  LIVE_MARKET,
  MARKET_CHECKLIST_KEYS,
  MARKET_CHECKLIST_LABELS,
  type MarketChecklistKey,
} from "@/lib/market-checklist"
import { seedDemoDatabase } from "@/lib/seed-demo"
import { decryptSecret, encryptSecret, secretLast4 } from "@/lib/shop-crypto"
import { resolveShopPaymentProvider } from "@/lib/shop-payments"

const SEED_VERSION = "11"

function dbPath() {
  return process.env.DESKULPT_DB_PATH || path.join(process.cwd(), "data", "deskulpt.sqlite")
}

/** Exclusive file lock so parallel Next build workers do not race seed/reset. */
function withDbInitLock<T>(fn: () => T): T {
  const lockPath = `${dbPath()}.initlock`
  const deadline = Date.now() + 20_000
  while (true) {
    try {
      const fd = fs.openSync(lockPath, "wx")
      try {
        return fn()
      } finally {
        fs.closeSync(fd)
        try {
          fs.unlinkSync(lockPath)
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for SQLite init lock at ${lockPath}`)
      }
      const wait = new Int32Array(new SharedArrayBuffer(4))
      Atomics.wait(wait, 0, 0, 40)
    }
  }
}

export type PackageTier = "starter" | "pro"

export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
  tenantId: string | null
  company: string | null
  trade: string | null
  serviceArea: string | null
  providerVerified: boolean
  tenantName: string | null
  tenantKind: "landlord" | "platform" | null
  tenantPackage: PackageTier | null
  phone: string | null
  displayCurrency: DisplayCurrency
  hasPassword: boolean
  /** Fixture identity; only these appear in the demo switcher. */
  isDemo: boolean
  tenantIsDemo: boolean
}

export type FloorRecord = {
  id: string
  tenantId: string
  propertyId: string
  label: string
  levelIndex: number
  planPath: string | null
}

export type UnitRecord = {
  id: string
  tenantId: string
  propertyId: string
  floorId: string | null
  code: string
  sqft: number
  clearHeight: string
  docks: number
  driveIns: number
  power: string
  ratePsf: number
  rateBasis: RateBasis
  rentAmountMinor: number | null
  attributes: UnitAttributes
  attributesJson: string
  bhk: number | null
  carpetSqft: number | null
  securityDepositMonths: number | null
  maintenanceMinor: number | null
  gstApplicable: boolean | null
  status: UnitStatus
  hotspotX: number | null
  hotspotY: number | null
  matterportUrl: string | null
  description: string
}

export type MediaRecord = {
  id: string
  kind: "photo" | "gif" | "video" | "pano"
  url: string
  caption: string
  sortOrder: number
}

export type PropertyRecord = {
  id: string
  tenantId: string
  tenantName: string
  name: string
  slug: string
  address: string
  area: string
  cityLine: string
  totalSqft: number
  segment: PropertySegment
  subtype: string
  floorPlanPath: string | null
  modelPath: string | null
  latitude: number | null
  longitude: number | null
  floors: FloorRecord[]
  units: UnitRecord[]
}

type Sql = DatabaseSync

const globalDb = globalThis as unknown as { deskulptDb?: Sql }

function asRow(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined
  return { ...(value as object) }
}

function asRows(values: unknown[]) {
  return values.map((value) => ({ ...(value as object) }) as Record<string, unknown>)
}

function str(row: Record<string, unknown>, key: string) {
  const value = row[key]
  return value == null ? null : String(value)
}

function num(row: Record<string, unknown>, key: string) {
  const value = row[key]
  return value == null ? null : Number(value)
}

function mapUser(row: Record<string, unknown>): SessionUser {
  const pkg = str(row, "tenant_package")
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: String(row.role) as Role,
    tenantId: str(row, "tenant_id"),
    company: str(row, "company"),
    trade: str(row, "trade"),
    serviceArea: str(row, "service_area"),
    providerVerified: Number(row.provider_verified) === 1,
    tenantName: str(row, "tenant_name"),
    tenantKind: (str(row, "tenant_kind") as "landlord" | "platform" | null) ?? null,
    tenantPackage: pkg === "pro" || pkg === "starter" ? pkg : null,
    phone: str(row, "phone"),
    displayCurrency: (str(row, "display_currency") as DisplayCurrency | null) ?? "INR",
    hasPassword: Boolean(str(row, "password_hash")),
    isDemo: Number(row.is_demo) === 1,
    tenantIsDemo: Number(row.tenant_is_demo) === 1,
  }
}

function mapUnit(row: Record<string, unknown>, segmentHint?: PropertySegment): UnitRecord {
  const segment =
    segmentHint ??
    (isPropertySegment(String(row.segment ?? "warehouse"))
      ? (String(row.segment) as PropertySegment)
      : "warehouse")
  const rateBasisRaw = str(row, "rate_basis") ?? "per_sqft_month"
  const rateBasis: RateBasis = rateBasisRaw === "flat_month" ? "flat_month" : "per_sqft_month"
  const attributesJson = str(row, "attributes") ?? "{}"
  const gstRaw = num(row, "gst_applicable")
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    propertyId: String(row.property_id),
    floorId: str(row, "floor_id"),
    code: String(row.code),
    sqft: Number(row.sqft),
    clearHeight: String(row.clear_height),
    docks: Number(row.docks),
    driveIns: Number(row.drive_ins),
    power: String(row.power),
    ratePsf: Number(row.rate_psf),
    rateBasis,
    rentAmountMinor: num(row, "rent_amount_minor"),
    attributes: parseUnitAttributes(segment, attributesJson),
    attributesJson,
    bhk: num(row, "bhk"),
    carpetSqft: num(row, "carpet_sqft"),
    securityDepositMonths: num(row, "security_deposit_months"),
    maintenanceMinor: num(row, "maintenance_minor"),
    gstApplicable: gstRaw == null ? null : gstRaw === 1,
    status: String(row.status) as UnitStatus,
    hotspotX: num(row, "hotspot_x"),
    hotspotY: num(row, "hotspot_y"),
    matterportUrl: str(row, "matterport_url"),
    description: String(row.description),
  }
}

const USER_SQL = `
  SELECT u.id, u.name, u.email, u.role, u.tenant_id, u.company, u.trade,
         u.service_area, u.provider_verified, u.phone, u.password_hash,
         COALESCE(u.is_demo, 0) AS is_demo,
         t.name AS tenant_name, t.kind AS tenant_kind,
         COALESCE(t.display_currency, 'INR') AS display_currency,
         COALESCE(t.package, 'starter') AS tenant_package,
         COALESCE(t.is_demo, 0) AS tenant_is_demo
  FROM users u
  LEFT JOIN tenants t ON t.id = u.tenant_id
`

function createSchema(db: Sql) {
  db.exec(`
    CREATE TABLE tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      city TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'landlord',
      display_currency TEXT NOT NULL DEFAULT 'INR',
      package TEXT NOT NULL DEFAULT 'starter',
      is_demo INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      tenant_id TEXT,
      company TEXT,
      trade TEXT,
      service_area TEXT,
      provider_verified INTEGER NOT NULL DEFAULT 0,
      phone TEXT,
      password_hash TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE consent_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT,
      purpose TEXT NOT NULL,
      version TEXT NOT NULL,
      granted INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      ip_hint TEXT
    );
    CREATE TABLE custom_domains (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      hostname TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      txt_token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      verified_at TEXT
    );
    CREATE TABLE otp_challenges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      phone_e164 TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      verified_at TEXT
    );
    CREATE TABLE provider_approvals (
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      PRIMARY KEY (tenant_id, user_id)
    );
    CREATE TABLE properties (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      address TEXT NOT NULL,
      area TEXT NOT NULL,
      city_line TEXT NOT NULL,
      total_sqft INTEGER NOT NULL,
      segment TEXT NOT NULL DEFAULT 'warehouse',
      subtype TEXT NOT NULL DEFAULT 'logistics_park',
      floor_plan_path TEXT,
      model_path TEXT,
      latitude REAL,
      longitude REAL
    );
    CREATE TABLE floors (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      label TEXT NOT NULL,
      level_index INTEGER NOT NULL,
      plan_path TEXT,
      UNIQUE (property_id, level_index)
    );
    CREATE TABLE visit_requests (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      unit_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      visit_type TEXT NOT NULL,
      preferred_at TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE units (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      floor_id TEXT,
      code TEXT NOT NULL,
      sqft INTEGER NOT NULL,
      clear_height TEXT NOT NULL,
      docks INTEGER NOT NULL,
      drive_ins INTEGER NOT NULL,
      power TEXT NOT NULL,
      rate_psf REAL NOT NULL,
      rate_basis TEXT NOT NULL DEFAULT 'per_sqft_month',
      rent_amount_minor INTEGER,
      attributes TEXT NOT NULL DEFAULT '{}',
      bhk INTEGER,
      carpet_sqft INTEGER,
      security_deposit_months REAL,
      maintenance_minor INTEGER,
      gst_applicable INTEGER,
      status TEXT NOT NULL,
      hotspot_x REAL,
      hotspot_y REAL,
      matterport_url TEXT,
      description TEXT NOT NULL,
      UNIQUE (property_id, code)
    );
    CREATE TABLE unit_media (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      url TEXT NOT NULL,
      caption TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE applications (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      applicant_id TEXT NOT NULL,
      company TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      email TEXT NOT NULL,
      intended_use TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      country TEXT NOT NULL,
      region TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      file_name TEXT,
      face_name TEXT,
      simulated_score REAL NOT NULL,
      simulated_result TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE late_fee_rules (
      tenant_id TEXT PRIMARY KEY,
      grace_days INTEGER NOT NULL,
      flat_cents INTEGER NOT NULL,
      percent_bps INTEGER NOT NULL
    );
    CREATE TABLE payment_methods (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      brand TEXT NOT NULL,
      last4 TEXT NOT NULL,
      autopay INTEGER NOT NULL DEFAULT 0,
      provider_ref TEXT NOT NULL
    );
    CREATE TABLE ledger_entries (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL,
      due_on TEXT,
      created_at TEXT NOT NULL,
      source_id TEXT
    );
    CREATE TABLE jobs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      unit_id TEXT,
      title TEXT NOT NULL,
      details TEXT NOT NULL,
      trade TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      href TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL,
      channel TEXT NOT NULL
    );
    CREATE TABLE market_drafts (
      id TEXT PRIMARY KEY,
      iso_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE market_checklist_items (
      draft_id TEXT NOT NULL,
      item_key TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (draft_id, item_key)
    );
    CREATE TABLE languages (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      waiting_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE shop_settings (
      tenant_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      demo_mode INTEGER NOT NULL DEFAULT 1,
      razorpay_key_id TEXT,
      razorpay_key_secret_enc TEXT,
      razorpay_mode TEXT NOT NULL DEFAULT 'test'
    );
    CREATE TABLE shop_skus (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      property_id TEXT,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      stock INTEGER,
      slot_capacity INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE shop_cart_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      sku_id TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1,
      slot_start TEXT,
      UNIQUE (user_id, tenant_id, sku_id, slot_start)
    );
    CREATE TABLE shop_orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      property_id TEXT,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      payment_provider TEXT NOT NULL,
      payment_ref TEXT,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      paid_at TEXT
    );
    CREATE TABLE shop_order_lines (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      sku_id TEXT NOT NULL,
      sku_name TEXT NOT NULL,
      kind TEXT NOT NULL,
      qty INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      slot_start TEXT
    );
    CREATE TABLE shop_rental_bookings (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      sku_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      slot_start TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      UNIQUE (sku_id, slot_start)
    );
    CREATE INDEX idx_units_tenant ON units(tenant_id);
    CREATE INDEX idx_units_property ON units(property_id);
    CREATE INDEX idx_floors_property ON floors(property_id);
    CREATE INDEX idx_apps_tenant ON applications(tenant_id, status);
    CREATE INDEX idx_apps_applicant ON applications(applicant_id);
    CREATE INDEX idx_jobs_tenant ON jobs(tenant_id, status);
    CREATE INDEX idx_jobs_provider ON jobs(provider_id);
    CREATE INDEX idx_ledger_tenant ON ledger_entries(tenant_id);
    CREATE INDEX idx_ledger_user ON ledger_entries(user_id);
    CREATE INDEX idx_notes_user ON notifications(user_id, created_at);
    CREATE INDEX idx_properties_tenant ON properties(tenant_id);
    CREATE INDEX idx_media_unit ON unit_media(unit_id, sort_order);
    CREATE INDEX idx_shop_skus_tenant ON shop_skus(tenant_id);
    CREATE INDEX idx_shop_cart_user ON shop_cart_items(user_id, tenant_id);
    CREATE INDEX idx_shop_orders_tenant ON shop_orders(tenant_id, created_at);
    CREATE INDEX idx_shop_orders_user ON shop_orders(user_id);
    CREATE INDEX idx_shop_rentals_sku ON shop_rental_bookings(sku_id, slot_start);
  `)
}

function reset(db: Sql) {
  db.exec("PRAGMA foreign_keys = OFF")
  for (const table of [
    "notifications",
    "otp_challenges",
    "ledger_entries",
    "payment_methods",
    "late_fee_rules",
    "jobs",
    "verifications",
    "applications",
    "visit_requests",
    "custom_domains",
    "shop_rental_bookings",
    "shop_order_lines",
    "shop_orders",
    "shop_cart_items",
    "shop_skus",
    "shop_settings",
    "unit_media",
    "units",
    "floors",
    "properties",
    "provider_approvals",
    "consent_events",
    "users",
    "tenants",
    "market_checklist_items",
    "market_drafts",
    "languages",
    "meta",
  ]) {
    db.exec(`DROP TABLE IF EXISTS ${table}`)
  }
  db.exec("PRAGMA foreign_keys = ON")
  createSchema(db)
  seed(db)
  db.prepare("INSERT INTO meta (key, value) VALUES ('seed_version', ?)").run(SEED_VERSION)
}

function seed(db: Sql) {
  seedDemoDatabase(db)
}

function openDatabase() {
  return withDbInitLock(() => {
    const file = dbPath()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const db = new DatabaseSync(file)
    // WAL + busy timeout: readers across workers after init.
    db.exec("PRAGMA journal_mode = WAL")
    db.exec("PRAGMA busy_timeout = 8000")
    db.exec("PRAGMA foreign_keys = ON")
    const meta = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'meta'",
    ).get()
    if (!meta) {
      reset(db)
      return db
    }
    const version = asRow(db.prepare("SELECT value FROM meta WHERE key = 'seed_version'").get())
    if (!version || version.value !== SEED_VERSION) reset(db)
    return db
  })
}

export function getDb() {
  if (!globalDb.deskulptDb) globalDb.deskulptDb = openDatabase()
  return globalDb.deskulptDb
}

/** Drop every table and reload the demo seed. Used by `npm run reset` and tests. */
export function resetSeedDatabase() {
  reset(getDb())
}

/** Close the process-wide SQLite handle so the next getDb() reopens (tests). */
export function closeDatabase() {
  if (!globalDb.deskulptDb) return
  globalDb.deskulptDb.close()
  globalDb.deskulptDb = undefined
}

export function recordConsentEvent(input: {
  userId: string | null
  email: string | null
  purpose: string
  version: string
  ipHint?: string | null
}) {
  getDb()
    .prepare(
      `INSERT INTO consent_events (id, user_id, email, purpose, version, granted, created_at, ip_hint)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .run(
      crypto.randomUUID(),
      input.userId,
      input.email,
      input.purpose,
      input.version,
      new Date().toISOString(),
      input.ipHint ?? null,
    )
}

/** DPDP-oriented export of the signed-in user's rows (no password hashes). */
export function exportUserData(userId: string) {
  const db = getDb()
  const user = getUser(userId)
  if (!user) return null
  const applications = asRows(
    db.prepare("SELECT * FROM applications WHERE applicant_id = ?").all(userId),
  )
  const ledger = asRows(db.prepare("SELECT * FROM ledger_entries WHERE user_id = ?").all(userId))
  const verifications = asRows(
    db
      .prepare(
        "SELECT id, country, region, doc_type, file_name, simulated_result, created_at FROM verifications WHERE user_id = ?",
      )
      .all(userId),
  )
  const consents = asRows(db.prepare("SELECT * FROM consent_events WHERE user_id = ?").all(userId))
  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      company: user.company,
    },
    applications,
    ledger,
    verifications,
    consents,
  }
}

/** Soft-delete personal fields for an applicant (keeps ledger integrity). */
export function redactUserPersonalData(userId: string) {
  const user = getUser(userId)
  if (!user) return { ok: false as const, error: "User not found." }
  if (user.role !== "applicant") {
    return { ok: false as const, error: "Self-service deletion is available for applicant accounts in this build." }
  }
  getDb()
    .prepare(
      `UPDATE users SET name = 'Redacted user', email = ?, phone = NULL, company = NULL, password_hash = NULL
       WHERE id = ?`,
    )
    .run(`redacted-${userId}@deleted.invalid`, userId)
  getDb().prepare("DELETE FROM verifications WHERE user_id = ?").run(userId)
  getDb().prepare("DELETE FROM otp_challenges WHERE user_id = ?").run(userId)
  recordConsentEvent({
    userId,
    email: user.email,
    purpose: "erasure_request",
    version: "dpdp-2023-v1",
  })
  return { ok: true as const }
}

export function listSessionUsers() {
  return asRows(
    getDb()
      .prepare(
        `${USER_SQL}
         WHERE COALESCE(u.is_demo, 0) = 1
         ORDER BY CASE
           WHEN u.role IN ('super_admin','account_manager','service_manager','property_manager','merchandiser') THEN 0
           WHEN u.role = 'applicant' THEN 1
           WHEN u.role = 'landlord_admin' THEN 2
           ELSE 3
         END, u.name`,
      )
      .all(),
  ).map(mapUser)
}

export function getUser(id: string) {
  const row = asRow(getDb().prepare(`${USER_SQL} WHERE u.id = ?`).get(id))
  return row ? mapUser(row) : null
}

export function unreadCount(userId: string) {
  const row = asRow(
    getDb()
      .prepare(
        "SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND channel = 'in_app' AND read_at IS NULL",
      )
      .get(userId),
  )
  return Number(row?.c ?? 0)
}

export type NoticeRecord = {
  id: string
  title: string
  body: string
  href: string | null
  readAt: string | null
  createdAt: string
  channel: string
}

export function listNotifications(
  userId: string,
  channel: "in_app" | "email_demo" | "push_demo" | "whatsapp_demo",
) {
  return asRows(
    getDb()
      .prepare(
        `SELECT id, title, body, href, read_at, created_at, channel
         FROM notifications WHERE user_id = ? AND channel = ? ORDER BY created_at DESC`,
      )
      .all(userId, channel),
  ).map(
    (row): NoticeRecord => ({
      id: String(row.id),
      title: String(row.title),
      body: String(row.body),
      href: str(row, "href"),
      readAt: str(row, "read_at"),
      createdAt: String(row.created_at),
      channel: String(row.channel),
    }),
  )
}

export function markAllRead(userId: string) {
  getDb()
    .prepare(
      "UPDATE notifications SET read_at = ? WHERE user_id = ? AND channel = 'in_app' AND read_at IS NULL",
    )
    .run(new Date().toISOString(), userId)
}

function unitsFor(propertyId: string, segment: PropertySegment = "warehouse") {
  return asRows(
    getDb()
      .prepare("SELECT * FROM units WHERE property_id = ? ORDER BY code")
      .all(propertyId),
  ).map((row) => mapUnit(row, segment))
}

function floorsFor(propertyId: string): FloorRecord[] {
  return asRows(
    getDb()
      .prepare(
        "SELECT * FROM floors WHERE property_id = ? ORDER BY level_index ASC",
      )
      .all(propertyId),
  ).map(
    (row): FloorRecord => ({
      id: String(row.id),
      tenantId: String(row.tenant_id),
      propertyId: String(row.property_id),
      label: String(row.label),
      levelIndex: Number(row.level_index),
      planPath: str(row, "plan_path"),
    }),
  )
}

function mapProperty(row: Record<string, unknown>): PropertyRecord {
  const id = String(row.id)
  const segmentRaw = String(row.segment ?? "warehouse")
  const segment: PropertySegment = isPropertySegment(segmentRaw) ? segmentRaw : "warehouse"
  return {
    id,
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name),
    name: String(row.name),
    slug: String(row.slug),
    address: String(row.address),
    area: String(row.area),
    cityLine: String(row.city_line),
    totalSqft: Number(row.total_sqft),
    segment,
    subtype: String(row.subtype ?? "logistics_park"),
    floorPlanPath: str(row, "floor_plan_path"),
    modelPath: str(row, "model_path"),
    latitude: num(row, "latitude"),
    longitude: num(row, "longitude"),
    floors: floorsFor(id),
    units: unitsFor(id, segment),
  }
}

const PROPERTY_SQL = `
  SELECT p.*, t.name AS tenant_name
  FROM properties p
  JOIN tenants t ON t.id = p.tenant_id
`

/**
 * Public catalog read. Cookie-free on purpose so a later cache key can be
 * the property slug alone. Do not read the session in this function.
 */
export function listPortfolio() {
  return asRows(getDb().prepare(`${PROPERTY_SQL} ORDER BY t.name, p.name`).all()).map(mapProperty)
}

export function getPropertyBySlug(slug: string) {
  const row = asRow(getDb().prepare(`${PROPERTY_SQL} WHERE p.slug = ?`).get(slug))
  return row ? mapProperty(row) : null
}

export function getUnitPage(slug: string, code: string) {
  const property = getPropertyBySlug(slug)
  if (!property) return null
  const unit = property.units.find((item) => item.code.toLowerCase() === code.toLowerCase())
  if (!unit) return null
  const mediaRows = asRows(
    getDb()
      .prepare(
        "SELECT id, kind, url, caption, sort_order FROM unit_media WHERE unit_id = ? AND tenant_id = ? ORDER BY sort_order",
      )
      .all(unit.id, unit.tenantId),
  ).map(
    (row): MediaRecord => ({
      id: String(row.id),
      kind: String(row.kind) as MediaRecord["kind"],
      url: String(row.url),
      caption: String(row.caption),
      sortOrder: Number(row.sort_order),
    }),
  )
  return { property, unit, media: mediaRows }
}

export function landlordOverview(tenantId: string) {
  const db = getDb()
  const units = asRows(
    db
      .prepare(
        `SELECT u.status, u.sqft, u.rate_psf, u.rate_basis, u.rent_amount_minor, p.segment
         FROM units u JOIN properties p ON p.id = u.property_id
         WHERE u.tenant_id = ?`,
      )
      .all(tenantId),
  )
  const leased = units.filter((unit) => unit.status === "leased")
  const occupancy = units.length === 0 ? 0 : Math.round((leased.length / units.length) * 100)
  const rentRoll = leased.reduce((sum, unit) => {
    const segmentRaw = String(unit.segment ?? "warehouse")
    const segment: PropertySegment = isPropertySegment(segmentRaw) ? segmentRaw : "warehouse"
    return (
      sum +
      unitMonthlyRentCents(
        mapUnit(
          {
            ...unit,
            id: "x",
            tenant_id: tenantId,
            property_id: "x",
            code: "x",
            clear_height: "",
            docks: 0,
            drive_ins: 0,
            power: "",
            attributes: "{}",
            description: "",
          },
          segment,
        ),
      )
    )
  }, 0)
  const apps = asRow(
    db.prepare(
      "SELECT COUNT(*) AS c FROM applications WHERE tenant_id = ? AND status = 'submitted'",
    ).get(tenantId),
  )
  const jobs = asRow(
    db.prepare(
      "SELECT COUNT(*) AS c FROM jobs WHERE tenant_id = ? AND status != 'complete'",
    ).get(tenantId),
  )
  const due = asRow(
    db.prepare(
      "SELECT COALESCE(SUM(amount_cents), 0) AS c FROM ledger_entries WHERE tenant_id = ? AND status = 'due' AND kind != 'payment'",
    ).get(tenantId),
  )
  return {
    occupancy,
    unitCount: units.length,
    leasedCount: leased.length,
    rentRollCents: rentRoll,
    openApplications: Number(apps?.c ?? 0),
    openJobs: Number(jobs?.c ?? 0),
    dueCents: Number(due?.c ?? 0),
  }
}

export function propertyForLandlord(tenantId: string, propertyId: string) {
  const row = asRow(
    getDb().prepare(`${PROPERTY_SQL} WHERE p.id = ? AND p.tenant_id = ?`).get(propertyId, tenantId),
  )
  return row ? mapProperty(row) : null
}

export type ApplicationRecord = {
  id: string
  tenantId: string
  company: string
  contactName: string
  email: string
  intendedUse: string
  notes: string
  status: ApplicationStatus
  createdAt: string
  unitId: string
  unitCode: string
  propertyId: string
  propertyName: string
  propertySlug: string
  propertyArea: string
  applicantId: string
  verification: {
    result: string
    score: number
    docType: string
    country: string
    region: string
  } | null
}

function mapApplication(row: Record<string, unknown>): ApplicationRecord {
  const result = str(row, "v_result")
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    company: String(row.company),
    contactName: String(row.contact_name),
    email: String(row.email),
    intendedUse: String(row.intended_use),
    notes: String(row.notes),
    status: String(row.status) as ApplicationStatus,
    createdAt: String(row.created_at),
    unitId: String(row.unit_id),
    unitCode: String(row.unit_code),
    propertyId: String(row.property_id),
    propertyName: String(row.property_name),
    propertySlug: String(row.property_slug),
    propertyArea: String(row.property_area),
    applicantId: String(row.applicant_id),
    verification: result
      ? {
          result,
          score: Number(row.v_score),
          docType: String(row.v_doc),
          country: String(row.v_country),
          region: String(row.v_region),
        }
      : null,
  }
}

const APP_SQL = `
  SELECT a.*, u.code AS unit_code, p.id AS property_id, p.name AS property_name,
         p.slug AS property_slug, p.area AS property_area,
         v.simulated_result AS v_result, v.simulated_score AS v_score,
         v.doc_type AS v_doc, v.country AS v_country, v.region AS v_region
  FROM applications a
  JOIN units u ON u.id = a.unit_id
  JOIN properties p ON p.id = u.property_id
  LEFT JOIN verifications v ON v.id = (
    SELECT id FROM verifications WHERE user_id = a.applicant_id ORDER BY created_at DESC LIMIT 1
  )
`

export function applicationsForTenant(tenantId: string) {
  return asRows(
    getDb().prepare(`${APP_SQL} WHERE a.tenant_id = ? ORDER BY a.created_at DESC`).all(tenantId),
  ).map(mapApplication)
}

export function applicationsForApplicant(userId: string) {
  return asRows(
    getDb().prepare(`${APP_SQL} WHERE a.applicant_id = ? ORDER BY a.created_at DESC`).all(userId),
  ).map(mapApplication)
}

export type JobRecord = {
  id: string
  tenantId: string
  tenantName: string
  propertyId: string
  propertyName: string
  area: string
  unitCode: string | null
  title: string
  details: string
  trade: Trade
  status: JobStatus
  providerId: string | null
  providerName: string | null
  createdAt: string
}

function mapJob(row: Record<string, unknown>): JobRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name),
    propertyId: String(row.property_id),
    propertyName: String(row.property_name),
    area: String(row.area),
    unitCode: str(row, "unit_code"),
    title: String(row.title),
    details: String(row.details),
    trade: String(row.trade) as Trade,
    status: String(row.status) as JobStatus,
    providerId: str(row, "provider_id"),
    providerName: str(row, "provider_name"),
    createdAt: String(row.created_at),
  }
}

const JOB_SQL = `
  SELECT j.*, p.name AS property_name, p.area, t.name AS tenant_name,
         u.code AS unit_code, prov.name AS provider_name
  FROM jobs j
  JOIN properties p ON p.id = j.property_id
  JOIN tenants t ON t.id = j.tenant_id
  LEFT JOIN units u ON u.id = j.unit_id
  LEFT JOIN users prov ON prov.id = j.provider_id
`

export function jobsForTenant(tenantId: string) {
  return asRows(
    getDb().prepare(`${JOB_SQL} WHERE j.tenant_id = ? ORDER BY j.created_at DESC`).all(tenantId),
  ).map(mapJob)
}

export function jobsForProvider(userId: string) {
  return asRows(
    getDb().prepare(`${JOB_SQL} WHERE j.provider_id = ? ORDER BY j.created_at DESC`).all(userId),
  ).map(mapJob)
}

export type ProviderRecord = {
  id: string
  name: string
  email: string
  trade: Trade
  serviceArea: string
  verified: boolean
  approval: "approved" | "pending" | "rejected" | "none"
}

export function providersForTenant(tenantId: string) {
  return asRows(
    getDb()
      .prepare(
        `SELECT u.id, u.name, u.email, u.trade, u.service_area, u.provider_verified,
                COALESCE(a.status, 'none') AS approval
         FROM users u
         LEFT JOIN provider_approvals a ON a.user_id = u.id AND a.tenant_id = ?
         WHERE u.role = 'service_provider'
           AND u.provider_verified = 1
           AND u.service_area IN (SELECT area FROM properties WHERE tenant_id = ?)
         ORDER BY u.service_area, u.trade, u.name`,
      )
      .all(tenantId, tenantId),
  ).map(
    (row): ProviderRecord => ({
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      trade: String(row.trade) as Trade,
      serviceArea: String(row.service_area),
      verified: Number(row.provider_verified) === 1,
      approval: String(row.approval) as ProviderRecord["approval"],
    }),
  )
}

export function eligibleProviders(tenantId: string, area: string, trade: string) {
  return providersForTenant(tenantId).filter(
    (provider) =>
      provider.approval === "approved" &&
      provider.serviceArea === area &&
      provider.trade === trade,
  )
}

export type LedgerRecord = {
  id: string
  tenantId: string
  tenantName: string
  unitId: string
  unitCode: string
  propertyName: string
  userId: string
  payerName: string
  kind: "rent" | "late_fee" | "payment" | "gst" | "deposit" | "maintenance"
  description: string
  amountCents: number
  status: "due" | "paid" | "waived"
  dueOn: string | null
  createdAt: string
  sourceId: string | null
}

function mapLedger(row: Record<string, unknown>): LedgerRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name),
    unitId: String(row.unit_id),
    unitCode: String(row.unit_code),
    propertyName: String(row.property_name),
    userId: String(row.user_id),
    payerName: String(row.payer_name),
    kind: String(row.kind) as LedgerRecord["kind"],
    description: String(row.description),
    amountCents: Number(row.amount_cents),
    status: String(row.status) as LedgerRecord["status"],
    dueOn: str(row, "due_on"),
    createdAt: String(row.created_at),
    sourceId: str(row, "source_id"),
  }
}

const LEDGER_SQL = `
  SELECT l.*, t.name AS tenant_name, u.code AS unit_code, p.name AS property_name, usr.name AS payer_name
  FROM ledger_entries l
  JOIN tenants t ON t.id = l.tenant_id
  JOIN units u ON u.id = l.unit_id
  JOIN properties p ON p.id = u.property_id
  JOIN users usr ON usr.id = l.user_id
`

export function ledgerForUser(userId: string) {
  return asRows(
    getDb().prepare(`${LEDGER_SQL} WHERE l.user_id = ? ORDER BY l.due_on DESC, l.created_at DESC`).all(userId),
  ).map(mapLedger)
}

export function ledgerForTenant(tenantId: string) {
  return asRows(
    getDb().prepare(`${LEDGER_SQL} WHERE l.tenant_id = ? ORDER BY l.due_on DESC, l.created_at DESC`).all(tenantId),
  ).map(mapLedger)
}

export type MethodRecord = {
  id: string
  tenantId: string
  brand: string
  last4: string
  autopay: boolean
  providerRef: string
}

export function methodsForUser(userId: string) {
  return asRows(
    getDb()
      .prepare(
        "SELECT id, tenant_id, brand, last4, autopay, provider_ref FROM payment_methods WHERE user_id = ?",
      )
      .all(userId),
  ).map(
    (row): MethodRecord => ({
      id: String(row.id),
      tenantId: String(row.tenant_id),
      brand: String(row.brand),
      last4: String(row.last4),
      autopay: Number(row.autopay) === 1,
      providerRef: String(row.provider_ref),
    }),
  )
}

export type LateFeeRule = {
  tenantId: string
  graceDays: number
  flatCents: number
  percentBps: number
}

export function ruleForTenant(tenantId: string): LateFeeRule {
  const row = asRow(
    getDb()
      .prepare("SELECT tenant_id, grace_days, flat_cents, percent_bps FROM late_fee_rules WHERE tenant_id = ?")
      .get(tenantId),
  )
  if (!row) return { tenantId, graceDays: 5, flatCents: 0, percentBps: 0 }
  return {
    tenantId: String(row.tenant_id),
    graceDays: Number(row.grace_days),
    flatCents: Number(row.flat_cents),
    percentBps: Number(row.percent_bps),
  }
}

export function latestVerification(userId: string) {
  const row = asRow(
    getDb()
      .prepare(
        `SELECT country, region, doc_type, file_name, face_name, simulated_score, simulated_result, created_at
         FROM verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      )
      .get(userId),
  )
  if (!row) return null
  return {
    country: String(row.country),
    region: String(row.region),
    docType: String(row.doc_type),
    fileName: str(row, "file_name"),
    faceName: str(row, "face_name"),
    score: Number(row.simulated_score),
    result: String(row.simulated_result),
    createdAt: String(row.created_at),
  }
}

export function landlordIds(tenantId: string) {
  return asRows(
    getDb()
      .prepare("SELECT id FROM users WHERE role = 'landlord_admin' AND tenant_id = ?")
      .all(tenantId),
  ).map((row) => String(row.id))
}

export function tenantsForApplicant(userId: string) {
  return asRows(
    getDb()
      .prepare(
        `SELECT DISTINCT t.id, t.name FROM (
           SELECT tenant_id FROM applications WHERE applicant_id = ?
           UNION
           SELECT tenant_id FROM ledger_entries WHERE user_id = ?
         ) src
         JOIN tenants t ON t.id = src.tenant_id
         ORDER BY t.name`,
      )
      .all(userId, userId),
  ).map((row) => ({ id: String(row.id), name: String(row.name) }))
}

function transaction(work: (db: Sql) => void) {
  const db = getDb()
  db.exec("BEGIN")
  try {
    work(db)
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}


export function slugifyOrg(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
  return base || "org"
}

export function createLandlordAccount(input: {
  name: string
  email: string
  passwordHash: string
  company: string
  packageTier?: PackageTier
}) {
  const db = getDb()
  const email = input.email.trim().toLowerCase()
  const existing = asRow(db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(email))
  if (existing) return { ok: false as const, error: "An account with that email already exists." }
  const company = input.company.trim()
  if (company.length < 2) return { ok: false as const, error: "Enter the organisation name." }
  let slug = slugifyOrg(company)
  let n = 0
  while (asRow(db.prepare("SELECT id FROM tenants WHERE slug = ?").get(slug))) {
    n += 1
    slug = `${slugifyOrg(company)}-${n}`
  }
  const tenantId = crypto.randomUUID()
  const userId = crypto.randomUUID()
  const pkg: PackageTier = input.packageTier ?? "starter"
  transaction((tx) => {
    tx.prepare(
      `INSERT INTO tenants (id, name, slug, city, kind, display_currency, package, is_demo)
       VALUES (?, ?, ?, ?, 'landlord', 'INR', ?, 0)`,
    ).run(tenantId, company, slug, "India", pkg)
    tx.prepare(
      `INSERT INTO users (
        id, name, email, role, tenant_id, company, trade, service_area, provider_verified, phone, password_hash, is_demo
      ) VALUES (?, ?, ?, 'landlord_admin', ?, ?, NULL, NULL, 0, NULL, ?, 0)`,
    ).run(userId, input.name.trim(), email, tenantId, company, input.passwordHash)
    tx.prepare(
      "INSERT INTO late_fee_rules (tenant_id, grace_days, flat_cents, percent_bps) VALUES (?, 5, 1500000, 150)",
    ).run(tenantId)
  })
  return { ok: true as const, userId, tenantId, slug }
}

export function getUserByEmail(email: string) {
  const row = asRow(
    getDb().prepare(`${USER_SQL} WHERE lower(u.email) = ?`).get(email.trim().toLowerCase()),
  )
  return row ? mapUser(row) : null
}

export function getPasswordHashForEmail(email: string): string | null {
  const row = asRow(
    getDb()
      .prepare("SELECT password_hash FROM users WHERE lower(email) = ?")
      .get(email.trim().toLowerCase()),
  )
  return str(row ?? {}, "password_hash")
}

export type CustomDomainRecord = {
  id: string
  tenantId: string
  hostname: string
  status: "pending" | "verified" | "active"
  txtToken: string
  createdAt: string
  verifiedAt: string | null
}

function mapDomain(row: Record<string, unknown>): CustomDomainRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    hostname: String(row.hostname),
    status: String(row.status) as CustomDomainRecord["status"],
    txtToken: String(row.txt_token),
    createdAt: String(row.created_at),
    verifiedAt: str(row, "verified_at"),
  }
}

export function listCustomDomains(tenantId: string) {
  return asRows(
    getDb()
      .prepare(
        "SELECT * FROM custom_domains WHERE tenant_id = ? ORDER BY created_at DESC",
      )
      .all(tenantId),
  ).map(mapDomain)
}

export function getTenantPackage(tenantId: string): PackageTier {
  const row = asRow(
    getDb().prepare("SELECT package FROM tenants WHERE id = ?").get(tenantId),
  )
  return str(row ?? {}, "package") === "pro" ? "pro" : "starter"
}

function normalizeHostname(raw: string): string | null {
  const host = raw.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0]
  if (!host || host.includes(" ") || !host.includes(".")) return null
  if (host.length > 253) return null
  if (!/^[a-z0-9.-]+$/.test(host)) return null
  return host
}

export function addCustomDomain(tenantId: string, hostnameRaw: string) {
  if (getTenantPackage(tenantId) !== "pro") {
    return { ok: false as const, error: "Custom domains require the PRO package." }
  }
  const hostname = normalizeHostname(hostnameRaw)
  if (!hostname) return { ok: false as const, error: "Enter a valid hostname such as listings.yourcompany.com." }
  const clash = asRow(
    getDb().prepare("SELECT id, tenant_id FROM custom_domains WHERE hostname = ?").get(hostname),
  )
  if (clash) {
    if (String(clash.tenant_id) === tenantId) {
      return { ok: false as const, error: "That hostname is already on your organisation." }
    }
    return { ok: false as const, error: "That hostname is already claimed." }
  }
  const id = crypto.randomUUID()
  const txtToken = `deskulpt-verify=${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO custom_domains (id, tenant_id, hostname, status, txt_token, created_at, verified_at)
       VALUES (?, ?, ?, 'pending', ?, ?, NULL)`,
    )
    .run(id, tenantId, hostname, txtToken, now)
  return { ok: true as const, domain: listCustomDomains(tenantId).find((d) => d.id === id)! }
}

/** Demo DNS check: marks verified when pending. Optional TXT match for guided step. */
export function verifyCustomDomain(
  tenantId: string,
  domainId: string,
  opts?: { demoForce?: boolean; observedTxt?: string | null },
) {
  if (getTenantPackage(tenantId) !== "pro") {
    return { ok: false as const, error: "Custom domains require the PRO package." }
  }
  const row = asRow(
    getDb()
      .prepare("SELECT * FROM custom_domains WHERE id = ? AND tenant_id = ?")
      .get(domainId, tenantId),
  )
  if (!row) return { ok: false as const, error: "Domain not found." }
  const domain = mapDomain(row)
  if (domain.status === "verified" || domain.status === "active") {
    return { ok: true as const, domain }
  }
  const observed = opts?.observedTxt?.trim()
  const demoOk = opts?.demoForce !== false
  if (observed && observed !== domain.txtToken && !observed.includes(domain.txtToken)) {
    return {
      ok: false as const,
      error: "TXT value does not match the challenge. Paste the exact deskulpt-verify=… token, or use Check DNS in demo mode.",
    }
  }
  if (!demoOk && !observed) {
    return { ok: false as const, error: "No TXT record observed yet." }
  }
  const now = new Date().toISOString()
  getDb()
    .prepare(
      "UPDATE custom_domains SET status = 'active', verified_at = ? WHERE id = ? AND tenant_id = ?",
    )
    .run(now, domainId, tenantId)
  return { ok: true as const, domain: listCustomDomains(tenantId).find((d) => d.id === domainId)! }
}

export function removeCustomDomain(tenantId: string, domainId: string) {
  getDb()
    .prepare("DELETE FROM custom_domains WHERE id = ? AND tenant_id = ?")
    .run(domainId, tenantId)
  return { ok: true as const }
}

export function findTenantByCustomHost(hostname: string) {
  const host = normalizeHostname(hostname)
  if (!host) return null
  const row = asRow(
    getDb()
      .prepare(
        `SELECT t.id, t.name, t.slug, d.hostname, d.status
         FROM custom_domains d
         JOIN tenants t ON t.id = d.tenant_id
         WHERE d.hostname = ? AND d.status IN ('verified', 'active')`,
      )
      .get(host),
  )
  if (!row) return null
  return {
    tenantId: String(row.id),
    tenantName: String(row.name),
    slug: String(row.slug),
    hostname: String(row.hostname),
  }
}

export function createVisitRequest(input: {
  unitId: string
  name: string
  email: string
  phone: string
  note: string
  visitType: "in_person" | "virtual"
  preferredAt: string | null
}) {
  const db = getDb()
  const unitRow = asRow(db.prepare("SELECT * FROM units WHERE id = ?").get(input.unitId))
  if (!unitRow) return { ok: false as const, error: "That bay is not listed." }
  const unit = mapUnit(unitRow)
  const property = asRow(
    db.prepare("SELECT id, slug, name FROM properties WHERE id = ?").get(unit.propertyId),
  )
  if (!property) return { ok: false as const, error: "That building is not listed." }
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO visit_requests (
      id, tenant_id, property_id, unit_id, name, email, phone, note, visit_type, preferred_at, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?)`,
  ).run(
    id,
    unit.tenantId,
    String(property.id),
    unit.id,
    input.name,
    input.email,
    input.phone,
    input.note,
    input.visitType,
    input.preferredAt,
    now,
  )
  return {
    ok: true as const,
    id,
    tenantId: unit.tenantId,
    propertySlug: String(property.slug),
    propertyName: String(property.name),
    unitCode: unit.code,
  }
}

export function createApplication(input: {
  unitId: string
  applicantId: string
  company: string
  contactName: string
  email: string
  intendedUse: string
  notes: string
}) {
  const db = getDb()
  const unitRow = asRow(db.prepare("SELECT * FROM units WHERE id = ?").get(input.unitId))
  if (!unitRow) return { ok: false as const, error: "That unit is not listed." }
  const propSeg = asRow(
    db.prepare("SELECT segment FROM properties WHERE id = ?").get(String(unitRow.property_id)),
  )
  const segmentRaw = String(propSeg?.segment ?? "warehouse")
  const segment: PropertySegment = isPropertySegment(segmentRaw) ? segmentRaw : "warehouse"
  const unit = mapUnit(unitRow, segment)
  if (unit.status === "leased") {
    return { ok: false as const, error: "This unit is leased. Choose an available one." }
  }
  const existing = asRow(
    db.prepare(
      "SELECT id FROM applications WHERE unit_id = ? AND applicant_id = ? AND status = 'submitted'",
    ).get(unit.id, input.applicantId),
  )
  if (existing) {
    return { ok: false as const, error: "You already have an open application on this bay." }
  }
  const property = asRow(db.prepare("SELECT slug, name FROM properties WHERE id = ?").get(unit.propertyId))
  const id = crypto.randomUUID()
  transaction((tx) => {
    tx.prepare(
      `INSERT INTO applications (
        id, tenant_id, unit_id, applicant_id, company, contact_name, email, intended_use, notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?)`,
    ).run(
      id,
      unit.tenantId,
      unit.id,
      input.applicantId,
      input.company,
      input.contactName,
      input.email,
      input.intendedUse,
      input.notes,
      new Date().toISOString(),
    )
    if (unit.status === "available") {
      tx.prepare("UPDATE units SET status = 'pending' WHERE id = ? AND tenant_id = ?").run(unit.id, unit.tenantId)
    }
  })
  return {
    ok: true as const,
    id,
    tenantId: unit.tenantId,
    code: unit.code,
    slug: String(property?.slug ?? ""),
    propertyName: String(property?.name ?? ""),
  }
}

export function decideApplication(
  tenantId: string,
  applicationId: string,
  decision: "approved" | "denied",
) {
  const db = getDb()
  const row = asRow(
    db.prepare(`${APP_SQL} WHERE a.id = ? AND a.tenant_id = ?`).get(applicationId, tenantId),
  )
  if (!row) return { ok: false as const, error: "That application is not in this organisation." }
  const application = mapApplication(row)
  if (application.status !== "submitted") {
    return { ok: false as const, error: "That application is already decided." }
  }
  const deniedIds: string[] = []
  transaction((tx) => {
    tx.prepare("UPDATE applications SET status = ? WHERE id = ? AND tenant_id = ?").run(
      decision,
      application.id,
      tenantId,
    )
    if (decision === "approved") {
      tx.prepare("UPDATE units SET status = 'leased' WHERE id = ? AND tenant_id = ?").run(
        application.unitId,
        tenantId,
      )
      const others = asRows(
        tx.prepare(
          "SELECT id, applicant_id FROM applications WHERE unit_id = ? AND tenant_id = ? AND status = 'submitted' AND id != ?",
        ).all(application.unitId, tenantId, application.id),
      )
      for (const other of others) {
        deniedIds.push(String(other.applicant_id))
        tx.prepare("UPDATE applications SET status = 'denied' WHERE id = ?").run(String(other.id))
      }
      const unitRow = asRow(tx.prepare("SELECT * FROM units WHERE id = ?").get(application.unitId))
      const propRow = asRow(
        tx.prepare("SELECT segment FROM properties WHERE id = ?").get(String(unitRow?.property_id)),
      )
      const segmentRaw = String(propRow?.segment ?? "warehouse")
      const segment: PropertySegment = isPropertySegment(segmentRaw) ? segmentRaw : "warehouse"
      const unit = mapUnit(unitRow ?? {}, segment)
      const dueOn = firstOfNextMonth()
      const amount = unitMonthlyRentCents(unit)
      const rentId = crypto.randomUUID()
      const now = new Date().toISOString()
      tx.prepare(
        `INSERT INTO ledger_entries (
          id, tenant_id, unit_id, user_id, kind, description, amount_cents, status, due_on, created_at, source_id
        ) VALUES (?, ?, ?, ?, 'rent', ?, ?, 'due', ?, ?, NULL)`,
      ).run(
        rentId,
        tenantId,
        application.unitId,
        application.applicantId,
        `Rent · Unit ${application.unitCode} · due ${dueOn}`,
        amount,
        dueOn,
        now,
      )
      if (
        gstAppliesForUnit({
          segment,
          gstApplicable: unit.gstApplicable,
        })
      ) {
        const gst = gstCents(amount)
        tx.prepare(
          `INSERT INTO ledger_entries (
            id, tenant_id, unit_id, user_id, kind, description, amount_cents, status, due_on, created_at, source_id
          ) VALUES (?, ?, ?, ?, 'gst', ?, ?, 'due', ?, ?, ?)`,
        ).run(
          crypto.randomUUID(),
          tenantId,
          application.unitId,
          application.applicantId,
          `GST (18%) · Unit ${application.unitCode} · due ${dueOn}`,
          gst,
          dueOn,
          now,
          rentId,
        )
      }
      const depositMonths =
        unit.securityDepositMonths ?? leaseProfile(segment).defaultDepositMonths
      if (depositMonths != null && depositMonths > 0) {
        const deposit = Math.round(amount * depositMonths)
        tx.prepare(
          `INSERT INTO ledger_entries (
            id, tenant_id, unit_id, user_id, kind, description, amount_cents, status, due_on, created_at, source_id
          ) VALUES (?, ?, ?, ?, 'deposit', ?, ?, 'due', ?, ?, ?)`,
        ).run(
          crypto.randomUUID(),
          tenantId,
          application.unitId,
          application.applicantId,
          `Security deposit · ${depositMonths} month${depositMonths === 1 ? "" : "s"} · Unit ${application.unitCode}`,
          deposit,
          dueOn,
          now,
          rentId,
        )
      }
      if (unit.maintenanceMinor != null && unit.maintenanceMinor > 0) {
        tx.prepare(
          `INSERT INTO ledger_entries (
            id, tenant_id, unit_id, user_id, kind, description, amount_cents, status, due_on, created_at, source_id
          ) VALUES (?, ?, ?, ?, 'maintenance', ?, ?, 'due', ?, ?, ?)`,
        ).run(
          crypto.randomUUID(),
          tenantId,
          application.unitId,
          application.applicantId,
          `Maintenance · Unit ${application.unitCode} · due ${dueOn}`,
          unit.maintenanceMinor,
          dueOn,
          now,
          rentId,
        )
      }
    } else {
      const remaining = asRow(
        tx.prepare(
          "SELECT COUNT(*) AS c FROM applications WHERE unit_id = ? AND status = 'submitted'",
        ).get(application.unitId),
      )
      if (Number(remaining?.c ?? 0) === 0) {
        tx.prepare(
          "UPDATE units SET status = 'available' WHERE id = ? AND tenant_id = ? AND status = 'pending'",
        ).run(application.unitId, tenantId)
      }
    }
  })
  return { ok: true as const, application, deniedIds }
}

export function setProviderApproval(tenantId: string, providerId: string, status: "approved" | "rejected") {
  const provider = asRow(
    getDb()
      .prepare(
        `SELECT id FROM users WHERE id = ? AND role = 'service_provider' AND provider_verified = 1
         AND service_area IN (SELECT area FROM properties WHERE tenant_id = ?)`,
      )
      .get(providerId, tenantId),
  )
  if (!provider) return { ok: false as const, error: "That provider is not verified for this portfolio's area." }
  getDb()
    .prepare(
      `INSERT INTO provider_approvals (tenant_id, user_id, status) VALUES (?, ?, ?)
       ON CONFLICT(tenant_id, user_id) DO UPDATE SET status = excluded.status`,
    )
    .run(tenantId, providerId, status)
  return { ok: true as const }
}

export function createJob(input: {
  tenantId: string
  propertyId: string
  unitId: string | null
  title: string
  details: string
  trade: Trade
  providerId: string | null
}) {
  const db = getDb()
  const property = asRow(
    db.prepare("SELECT id, area, name, slug FROM properties WHERE id = ? AND tenant_id = ?").get(
      input.propertyId,
      input.tenantId,
    ),
  )
  if (!property) return { ok: false as const, error: "That building is not in this organisation." }
  if (input.unitId) {
    const unit = asRow(
      db.prepare("SELECT id FROM units WHERE id = ? AND property_id = ? AND tenant_id = ?").get(
        input.unitId,
        input.propertyId,
        input.tenantId,
      ),
    )
    if (!unit) return { ok: false as const, error: "That bay is not in the selected building." }
  }
  let providerId: string | null = null
  if (input.providerId) {
    const eligible = eligibleProviders(input.tenantId, String(property.area), input.trade)
    if (!eligible.some((provider) => provider.id === input.providerId)) {
      return {
        ok: false as const,
        error: "That provider is not approved for this trade and area.",
      }
    }
    providerId = input.providerId
  }
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO jobs (id, tenant_id, property_id, unit_id, title, details, trade, status, provider_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.tenantId,
    input.propertyId,
    input.unitId,
    input.title,
    input.details,
    input.trade,
    providerId ? "assigned" : "open",
    providerId,
    new Date().toISOString(),
  )
  return {
    ok: true as const,
    id,
    providerId,
    propertyName: String(property.name),
    slug: String(property.slug),
  }
}

export function assignJob(tenantId: string, jobId: string, providerId: string) {
  const db = getDb()
  const job = asRow(
    db.prepare(`${JOB_SQL} WHERE j.id = ? AND j.tenant_id = ?`).get(jobId, tenantId),
  )
  if (!job) return { ok: false as const, error: "That job is not in this organisation." }
  const mapped = mapJob(job)
  if (mapped.status === "complete") return { ok: false as const, error: "That job is already complete." }
  const eligible = eligibleProviders(tenantId, mapped.area, mapped.trade)
  if (!eligible.some((provider) => provider.id === providerId)) {
    return { ok: false as const, error: "That provider is not approved for this trade and area." }
  }
  db.prepare(
    "UPDATE jobs SET provider_id = ?, status = 'assigned' WHERE id = ? AND tenant_id = ?",
  ).run(providerId, jobId, tenantId)
  return { ok: true as const, job: { ...mapped, providerId } }
}

export function transitionJob(providerId: string, jobId: string, next: "accepted" | "complete") {
  const db = getDb()
  const job = asRow(db.prepare(`${JOB_SQL} WHERE j.id = ? AND j.provider_id = ?`).get(jobId, providerId))
  if (!job) return { ok: false as const, error: "That job is not assigned to you." }
  const mapped = mapJob(job)
  if (next === "accepted" && mapped.status !== "assigned") {
    return { ok: false as const, error: "Only an assigned job can be accepted." }
  }
  if (next === "complete" && mapped.status !== "accepted") {
    return { ok: false as const, error: "Accept the job before marking it complete." }
  }
  db.prepare("UPDATE jobs SET status = ? WHERE id = ? AND provider_id = ?").run(next, jobId, providerId)
  return { ok: true as const, job: mapped }
}

export function saveHotspots(
  tenantId: string,
  propertyId: string,
  spots: { id: string; x: number | null; y: number | null }[],
) {
  const property = propertyForLandlord(tenantId, propertyId)
  if (!property) return { ok: false as const, error: "Building not found in this organisation." }
  const ids = new Set(property.units.map((unit) => unit.id))
  transaction((tx) => {
    const update = tx.prepare(
      "UPDATE units SET hotspot_x = ?, hotspot_y = ? WHERE id = ? AND property_id = ? AND tenant_id = ?",
    )
    for (const spot of spots) {
      if (!ids.has(spot.id)) continue
      update.run(spot.x, spot.y, spot.id, propertyId, tenantId)
    }
  })
  return { ok: true as const, slug: property.slug }
}

export function createPropertyForLandlord(input: {
  tenantId: string
  name: string
  address: string
  area: string
  cityLine: string
  segment: PropertySegment
  subtype: string
  totalSqft?: number
  latitude?: number | null
  longitude?: number | null
  unit?: {
    code: string
    description: string
    status?: UnitStatus
    sqft: number
    ratePsf?: number
    rateBasis: RateBasis
    rentAmountMinor?: number | null
    clearHeight?: string
    docks?: number
    driveIns?: number
    power?: string
    attributes: UnitAttributes
    bhk?: number | null
    carpetSqft?: number | null
    securityDepositMonths?: number | null
    maintenanceMinor?: number | null
    gstApplicable?: boolean | null
  }
}) {
  const db = getDb()
  const tenant = asRow(
    db.prepare("SELECT id FROM tenants WHERE id = ? AND kind = 'landlord'").get(input.tenantId),
  )
  if (!tenant) return { ok: false as const, error: "Landlord organisation not found." }
  const slugBase = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
  let slug = slugBase || `property-${crypto.randomUUID().slice(0, 8)}`
  let n = 2
  while (asRow(db.prepare("SELECT id FROM properties WHERE slug = ?").get(slug))) {
    slug = `${slugBase}-${n}`
    n += 1
  }
  const propertyId = crypto.randomUUID()
  const profile = leaseProfile(input.segment)
  transaction((tx) => {
    tx.prepare(
      `INSERT INTO properties (
        id, tenant_id, name, slug, address, area, city_line, total_sqft, segment, subtype,
        floor_plan_path, model_path, latitude, longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
    ).run(
      propertyId,
      input.tenantId,
      input.name.trim(),
      slug,
      input.address.trim(),
      input.area.trim(),
      input.cityLine.trim(),
      input.totalSqft ?? input.unit?.sqft ?? 0,
      input.segment,
      input.subtype,
      input.latitude ?? null,
      input.longitude ?? null,
    )
    if (input.unit) {
      const u = input.unit
      const attrsJson = stringifyAttributes(u.attributes)
      tx.prepare(
        `INSERT INTO units (
          id, tenant_id, property_id, floor_id, code, sqft, clear_height, docks, drive_ins, power,
          rate_psf, rate_basis, rent_amount_minor, attributes, bhk, carpet_sqft,
          security_deposit_months, maintenance_minor, gst_applicable,
          status, hotspot_x, hotspot_y, matterport_url, description
        ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)`,
      ).run(
        crypto.randomUUID(),
        input.tenantId,
        propertyId,
        u.code.trim(),
        u.sqft,
        u.clearHeight ?? "",
        u.docks ?? 0,
        u.driveIns ?? 0,
        u.power ?? "",
        u.ratePsf ?? 0,
        u.rateBasis,
        u.rentAmountMinor ?? null,
        attrsJson,
        u.bhk ?? null,
        u.carpetSqft ?? null,
        u.securityDepositMonths ?? profile.defaultDepositMonths,
        u.maintenanceMinor ?? null,
        u.gstApplicable == null ? (profile.gstOnRent ? 1 : 0) : u.gstApplicable ? 1 : 0,
        u.status ?? "available",
        u.description.trim(),
      )
    }
  })
  return { ok: true as const, propertyId, slug }
}

export function saveFloorPlan(tenantId: string, propertyId: string, publicPath: string) {
  const property = propertyForLandlord(tenantId, propertyId)
  if (!property) return { ok: false as const, error: "Building not found in this organisation." }
  getDb()
    .prepare("UPDATE properties SET floor_plan_path = ? WHERE id = ? AND tenant_id = ?")
    .run(publicPath, propertyId, tenantId)
  return { ok: true as const, slug: property.slug }
}

export function saveLateFeeRule(
  tenantId: string,
  rule: { graceDays: number; flatCents: number; percentBps: number },
) {
  getDb()
    .prepare(
      `INSERT INTO late_fee_rules (tenant_id, grace_days, flat_cents, percent_bps) VALUES (?, ?, ?, ?)
       ON CONFLICT(tenant_id) DO UPDATE SET grace_days = excluded.grace_days, flat_cents = excluded.flat_cents, percent_bps = excluded.percent_bps`,
    )
    .run(tenantId, rule.graceDays, rule.flatCents, rule.percentBps)
}

export function assessLateFees(tenantId: string) {
  const db = getDb()
  const rule = ruleForTenant(tenantId)
  const today = todayISO()
  const rents = asRows(
    db.prepare(
      `SELECT id, unit_id, user_id, amount_cents, due_on, description
       FROM ledger_entries WHERE tenant_id = ? AND kind = 'rent' AND status = 'due'`,
    ).all(tenantId),
  )
  let created = 0
  for (const rent of rents) {
    const dueOn = str(rent, "due_on")
    if (!dueOn) continue
    if (today <= addDays(dueOn, rule.graceDays)) continue
    const existing = asRow(
      db.prepare(
        "SELECT id FROM ledger_entries WHERE tenant_id = ? AND kind = 'late_fee' AND source_id = ?",
      ).get(tenantId, String(rent.id)),
    )
    if (existing) continue
    const amount = lateFeeCents(Number(rent.amount_cents), rule)
    db.prepare(
      `INSERT INTO ledger_entries (
        id, tenant_id, unit_id, user_id, kind, description, amount_cents, status, due_on, created_at, source_id
      ) VALUES (?, ?, ?, ?, 'late_fee', ?, ?, 'due', ?, ?, ?)`,
    ).run(
      crypto.randomUUID(),
      tenantId,
      String(rent.unit_id),
      String(rent.user_id),
      `Late fee · ${String(rent.description)}`,
      amount,
      addDays(dueOn, rule.graceDays),
      new Date().toISOString(),
      String(rent.id),
    )
    created += 1
  }
  return created
}

export function upsertMethod(input: {
  userId: string
  tenantId: string
  brand: string
  last4: string
  autopay: boolean
  providerRef: string
}) {
  const allowed = tenantsForApplicant(input.userId).some((tenant) => tenant.id === input.tenantId)
  if (!allowed) return { ok: false as const, error: "You do not have an application or ledger with that landlord." }
  const db = getDb()
  db.prepare("DELETE FROM payment_methods WHERE user_id = ? AND tenant_id = ?").run(input.userId, input.tenantId)
  db.prepare(
    `INSERT INTO payment_methods (id, user_id, tenant_id, brand, last4, autopay, provider_ref)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    crypto.randomUUID(),
    input.userId,
    input.tenantId,
    input.brand,
    input.last4,
    input.autopay ? 1 : 0,
    input.providerRef,
  )
  return { ok: true as const }
}

export function setAutopay(userId: string, tenantId: string, enabled: boolean) {
  const method = methodsForUser(userId).find((item) => item.tenantId === tenantId)
  if (!method) return { ok: false as const, error: "Add a demo payment method first." }
  getDb()
    .prepare("UPDATE payment_methods SET autopay = ? WHERE user_id = ? AND tenant_id = ?")
    .run(enabled ? 1 : 0, userId, tenantId)
  return { ok: true as const, providerRef: method.providerRef }
}

export function payDue(userId: string, tenantId: string) {
  const method = methodsForUser(userId).find((item) => item.tenantId === tenantId)
  if (!method) return { ok: false as const, error: "Add a demo payment method first." }
  const due = ledgerForUser(userId).filter(
    (entry) => entry.tenantId === tenantId && entry.status === "due" && entry.kind !== "payment",
  )
  if (due.length === 0) return { ok: false as const, error: "Nothing is due." }
  const amount = due.reduce((sum, entry) => sum + entry.amountCents, 0)
  const now = new Date().toISOString()
  transaction((tx) => {
    for (const entry of due) {
      tx.prepare(
        "UPDATE ledger_entries SET status = 'paid' WHERE id = ? AND user_id = ? AND tenant_id = ?",
      ).run(entry.id, userId, tenantId)
    }
    tx.prepare(
      `INSERT INTO ledger_entries (
        id, tenant_id, unit_id, user_id, kind, description, amount_cents, status, due_on, created_at, source_id
      ) VALUES (?, ?, ?, ?, 'payment', ?, ?, 'paid', ?, ?, NULL)`,
    ).run(
      crypto.randomUUID(),
      tenantId,
      due[0].unitId,
      userId,
      `${method.brand} ····${method.last4} · ${due.length} open item${due.length === 1 ? "" : "s"}`,
      amount,
      todayISO(),
      now,
    )
  })
  return { ok: true as const, amountCents: amount, providerRef: method.providerRef, count: due.length }
}

export function setTenantDisplayCurrency(tenantId: string, currency: DisplayCurrency) {
  getDb()
    .prepare("UPDATE tenants SET display_currency = ? WHERE id = ? AND kind = 'landlord'")
    .run(currency, tenantId)
  return { ok: true as const }
}

export function saveVerification(input: {
  userId: string
  country: string
  region: string
  docType: string
  fileName: string | null
  faceName: string | null
  score: number
  result: string
}) {
  getDb()
    .prepare(
      `INSERT INTO verifications (
        id, user_id, country, region, doc_type, file_name, face_name, simulated_score, simulated_result, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      crypto.randomUUID(),
      input.userId,
      input.country,
      input.region,
      input.docType,
      input.fileName,
      input.faceName,
      input.score,
      input.result,
      new Date().toISOString(),
    )
}

export function openApplicationTenants(userId: string) {
  return asRows(
    getDb()
      .prepare(
        `SELECT DISTINCT a.tenant_id AS id FROM applications a
         WHERE a.applicant_id = ? AND a.status = 'submitted'`,
      )
      .all(userId),
  ).map((row) => String(row.id))
}

export type ListingFilters = {
  q?: string
  tenantId?: string
  area?: string
  segment?: PropertySegment
  statuses?: UnitStatus[]
  minSqft?: number
  maxSqft?: number
  minRate?: number
  maxRate?: number
  minMonthly?: number
  maxMonthly?: number
  minDocks?: number
  minDriveIns?: number
  minClearHeight?: number
  power?: string
  bhk?: number
  furnishing?: string
  fitOut?: string
  hasFloorPlan?: boolean
  hasMatterport?: boolean
  hasPano?: boolean
  sort?: "rate_asc" | "rate_desc" | "sqft_asc" | "sqft_desc" | "name" | "monthly_asc" | "monthly_desc"
}

export type ListingCard = {
  unitId: string
  code: string
  status: UnitStatus
  sqft: number
  clearHeight: string
  clearHeightFeet: number
  docks: number
  driveIns: number
  power: string
  ratePsf: number
  rateBasis: RateBasis
  monthlyCents: number
  bhk: number | null
  carpetSqft: number | null
  furnishing: string | null
  fitOut: string | null
  segment: PropertySegment
  subtype: string
  description: string
  matterportUrl: string | null
  hasPano: boolean
  coverUrl: string | null
  propertyId: string
  propertyName: string
  propertySlug: string
  address: string
  area: string
  cityLine: string
  floorPlanPath: string | null
  latitude: number | null
  longitude: number | null
  tenantId: string
  tenantName: string
}

export function listingFacets() {
  const db = getDb()
  const areas = asRows(
    db.prepare("SELECT DISTINCT area FROM properties ORDER BY area").all(),
  ).map((row) => String(row.area))
  const landlords = asRows(
    db
      .prepare(
        `SELECT id, name FROM tenants WHERE kind = 'landlord' ORDER BY name`,
      )
      .all(),
  ).map((row) => ({ id: String(row.id), name: String(row.name) }))
  return { areas, landlords }
}

/**
 * Public listings search. Cookie-free on purpose.
 */
export function searchListings(filters: ListingFilters = {}): ListingCard[] {
  const rows = asRows(
    getDb()
      .prepare(
        `SELECT
           u.id AS unit_id, u.code, u.status, u.sqft, u.clear_height, u.docks, u.drive_ins,
           u.power, u.rate_psf, u.rate_basis, u.rent_amount_minor, u.attributes, u.bhk, u.carpet_sqft,
           u.description, u.matterport_url,
           p.id AS property_id, p.name AS property_name, p.slug AS property_slug,
           p.address, p.area, p.city_line, p.floor_plan_path, p.latitude, p.longitude,
           p.segment, p.subtype,
           t.id AS tenant_id, t.name AS tenant_name,
           EXISTS(SELECT 1 FROM unit_media m WHERE m.unit_id = u.id AND m.kind = 'pano') AS has_pano,
           (
             SELECT m.url FROM unit_media m
             WHERE m.unit_id = u.id AND m.kind = 'photo'
             ORDER BY m.sort_order ASC LIMIT 1
           ) AS cover_url
         FROM units u
         JOIN properties p ON p.id = u.property_id
         JOIN tenants t ON t.id = u.tenant_id AND t.kind = 'landlord'`,
      )
      .all(),
  )

  const q = filters.q?.trim().toLowerCase() ?? ""
  const statuses = filters.statuses?.length ? new Set(filters.statuses) : null

  let cards = rows.map((row): ListingCard => {
    const segmentRaw = String(row.segment ?? "warehouse")
    const segment: PropertySegment = isPropertySegment(segmentRaw) ? segmentRaw : "warehouse"
    const unit = mapUnit(
      {
        id: row.unit_id,
        tenant_id: row.tenant_id,
        property_id: row.property_id,
        floor_id: null,
        code: row.code,
        sqft: row.sqft,
        clear_height: row.clear_height,
        docks: row.docks,
        drive_ins: row.drive_ins,
        power: row.power,
        rate_psf: row.rate_psf,
        rate_basis: row.rate_basis,
        rent_amount_minor: row.rent_amount_minor,
        attributes: row.attributes,
        bhk: row.bhk,
        carpet_sqft: row.carpet_sqft,
        status: row.status,
        hotspot_x: null,
        hotspot_y: null,
        matterport_url: row.matterport_url,
        description: row.description,
      },
      segment,
    )
    const clearHeight = unit.clearHeight
    const feet = Number((clearHeight.match(/(\d+(?:\.\d+)?)/) ?? [0, "0"])[1])
    const attrs = unit.attributes as Record<string, unknown>
    return {
      unitId: unit.id,
      code: unit.code,
      status: unit.status,
      sqft: unit.sqft,
      clearHeight,
      clearHeightFeet: feet,
      docks: unit.docks,
      driveIns: unit.driveIns,
      power: unit.power,
      ratePsf: unit.ratePsf,
      rateBasis: unit.rateBasis,
      monthlyCents: unitMonthlyRentCents(unit),
      bhk: unit.bhk,
      carpetSqft: unit.carpetSqft,
      furnishing: typeof attrs.furnishing === "string" ? attrs.furnishing : null,
      fitOut: typeof attrs.fitOut === "string" ? attrs.fitOut : null,
      segment,
      subtype: String(row.subtype ?? "logistics_park"),
      description: unit.description,
      matterportUrl: unit.matterportUrl,
      hasPano: Number(row.has_pano) === 1,
      coverUrl: str(row, "cover_url"),
      propertyId: String(row.property_id),
      propertyName: String(row.property_name),
      propertySlug: String(row.property_slug),
      address: String(row.address),
      area: String(row.area),
      cityLine: String(row.city_line),
      floorPlanPath: str(row, "floor_plan_path"),
      latitude: num(row, "latitude"),
      longitude: num(row, "longitude"),
      tenantId: String(row.tenant_id),
      tenantName: String(row.tenant_name),
    }
  })

  cards = cards.filter((card) => {
    if (statuses && !statuses.has(card.status)) return false
    if (filters.segment && card.segment !== filters.segment) return false
    if (filters.tenantId && card.tenantId !== filters.tenantId) return false
    if (filters.area && card.area !== filters.area) return false
    if (filters.minSqft != null && card.sqft < filters.minSqft) return false
    if (filters.maxSqft != null && card.sqft > filters.maxSqft) return false
    if (filters.minRate != null && card.rateBasis === "per_sqft_month" && card.ratePsf < filters.minRate)
      return false
    if (filters.maxRate != null && card.rateBasis === "per_sqft_month" && card.ratePsf > filters.maxRate)
      return false
    if (filters.minMonthly != null && card.monthlyCents < filters.minMonthly * 100) return false
    if (filters.maxMonthly != null && card.monthlyCents > filters.maxMonthly * 100) return false
    if (filters.minDocks != null && card.docks < filters.minDocks) return false
    if (filters.minDriveIns != null && card.driveIns < filters.minDriveIns) return false
    if (filters.minClearHeight != null && card.clearHeightFeet < filters.minClearHeight) return false
    if (filters.power) {
      const needle = filters.power.trim().toLowerCase()
      if (needle && !card.power.toLowerCase().includes(needle)) return false
    }
    if (filters.bhk != null && card.bhk !== filters.bhk) return false
    if (filters.furnishing && card.furnishing !== filters.furnishing) return false
    if (filters.fitOut && card.fitOut !== filters.fitOut) return false
    if (filters.hasFloorPlan && !card.floorPlanPath) return false
    if (filters.hasMatterport && !card.matterportUrl) return false
    if (filters.hasPano && !card.hasPano) return false
    if (q) {
      const hay = [
        card.propertyName,
        card.address,
        card.area,
        card.cityLine,
        card.code,
        card.description,
        card.tenantName,
        card.power,
        card.segment,
        card.subtype,
      ]
        .join(" ")
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const sort = filters.sort ?? "name"
  cards.sort((a, b) => {
    if (sort === "rate_asc") return a.ratePsf - b.ratePsf
    if (sort === "rate_desc") return b.ratePsf - a.ratePsf
    if (sort === "monthly_asc") return a.monthlyCents - b.monthlyCents
    if (sort === "monthly_desc") return b.monthlyCents - a.monthlyCents
    if (sort === "sqft_asc") return a.sqft - b.sqft
    if (sort === "sqft_desc") return b.sqft - a.sqft
    return `${a.propertyName} ${a.code}`.localeCompare(`${b.propertyName} ${b.code}`)
  })
  return cards
}

export type CmsPersona = {
  id: string
  name: string
  email: string | null
  role: Role
  roleLabel: string
  company: string | null
  trade: string | null
  serviceArea: string | null
  providerVerified: boolean
  tenantId: string | null
  tenantName: string | null
  meta: string
}

function redactEmail(email: string, mode: "full" | "masked" | "none") {
  if (mode === "none") return null
  if (mode === "masked") {
    const at = email.indexOf("@")
    if (at <= 0) return "••••"
    return `••••@${email.slice(at + 1)}`
  }
  return email
}

export function cmsPlatformStaff(actor: SessionUser): CmsPersona[] {
  if (actor.role !== "super_admin") return []
  return asRows(
    getDb()
      .prepare(
        `${USER_SQL} WHERE t.kind = 'platform' ORDER BY u.role, u.name`,
      )
      .all(),
  ).map((row) => {
    const user = mapUser(row)
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel: user.role,
      company: user.company,
      trade: null,
      serviceArea: null,
      providerVerified: false,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
      meta: "Platform staff",
    }
  })
}

export function cmsLandlords(actor: SessionUser): {
  orgs: { id: string; name: string; slug: string; city: string; adminCount: number; propertyCount: number }[]
  admins: CmsPersona[]
} {
  if (actor.role !== "super_admin" && actor.role !== "account_manager") {
    return { orgs: [], admins: [] }
  }
  const db = getDb()
  const orgs = asRows(
    db
      .prepare(
        `SELECT t.id, t.name, t.slug, t.city,
                (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.role = 'landlord_admin') AS admin_count,
                (SELECT COUNT(*) FROM properties p WHERE p.tenant_id = t.id) AS property_count
         FROM tenants t WHERE t.kind = 'landlord' ORDER BY t.name`,
      )
      .all(),
  ).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    city: String(row.city),
    adminCount: Number(row.admin_count),
    propertyCount: Number(row.property_count),
  }))
  const admins = asRows(
    db.prepare(`${USER_SQL} WHERE u.role = 'landlord_admin' ORDER BY t.name, u.name`).all(),
  ).map((row) => {
    const user = mapUser(row)
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel: "Landlord admin",
      company: user.tenantName,
      trade: null,
      serviceArea: null,
      providerVerified: false,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
      meta: `${user.tenantName ?? "Landlord"} · ${user.email}`,
    }
  })
  return { orgs, admins }
}

export function cmsApplicants(actor: SessionUser): CmsPersona[] {
  if (
    actor.role !== "super_admin" &&
    actor.role !== "account_manager" &&
    actor.role !== "property_manager"
  ) {
    return []
  }
  const emailMode = actor.role === "property_manager" ? "masked" : "full"
  return asRows(
    getDb().prepare(`${USER_SQL} WHERE u.role = 'applicant' ORDER BY u.name`).all(),
  ).map((row) => {
    const user = mapUser(row)
    const apps = asRow(
      getDb()
        .prepare(
          `SELECT COUNT(*) AS c,
                  SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS open_c,
                  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_c
           FROM applications WHERE applicant_id = ?`,
        )
        .get(user.id),
    )
    const email = redactEmail(user.email, emailMode)
    return {
      id: user.id,
      name: user.name,
      email,
      role: user.role,
      roleLabel: "Applicant",
      company: user.company,
      trade: null,
      serviceArea: null,
      providerVerified: false,
      tenantId: null,
      tenantName: null,
      meta: `${Number(apps?.c ?? 0)} application(s) · ${Number(apps?.open_c ?? 0)} in review · ${Number(apps?.approved_c ?? 0)} approved`,
    }
  })
}

export function cmsProviders(actor: SessionUser): (CmsPersona & {
  approvals: { tenantId: string; tenantName: string; status: string }[]
})[] {
  if (actor.role !== "super_admin" && actor.role !== "service_manager") return []
  const db = getDb()
  return asRows(
    db.prepare(`${USER_SQL} WHERE u.role = 'service_provider' ORDER BY u.service_area, u.name`).all(),
  ).map((row) => {
    const user = mapUser(row)
    const approvals = asRows(
      db
        .prepare(
          `SELECT pa.tenant_id, t.name AS tenant_name, pa.status
           FROM provider_approvals pa
           JOIN tenants t ON t.id = pa.tenant_id
           WHERE pa.user_id = ?
           ORDER BY t.name`,
        )
        .all(user.id),
    ).map((item) => ({
      tenantId: String(item.tenant_id),
      tenantName: String(item.tenant_name),
      status: String(item.status),
    }))
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel: "Service provider",
      company: null,
      trade: user.trade,
      serviceArea: user.serviceArea,
      providerVerified: user.providerVerified,
      tenantId: null,
      tenantName: null,
      meta: `${user.trade ?? "trade"} · ${user.serviceArea ?? "area"} · ${user.providerVerified ? "verified" : "unverified"}`,
      approvals,
    }
  })
}

export function cmsListingReadiness(actor: SessionUser) {
  if (
    actor.role !== "super_admin" &&
    actor.role !== "property_manager" &&
    actor.role !== "merchandiser"
  ) {
    return []
  }
  return searchListings({ sort: "name" }).map((card) => {
    const gaps = [
      !card.floorPlanPath ? "No floor plan" : null,
      !card.hasPano ? "No 360 photo" : null,
      !card.matterportUrl ? "No walkthrough URL" : null,
    ].filter(Boolean) as string[]
    return {
      ...card,
      ready: gaps.length === 0,
      gaps,
    }
  })
}

export function inviteLandlord(input: {
  companyName: string
  city: string
  adminName: string
  adminEmail: string
}) {
  const db = getDb()
  const slugBase = input.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "landlord"
  let slug = slugBase
  let n = 1
  while (asRow(db.prepare("SELECT id FROM tenants WHERE slug = ?").get(slug))) {
    n += 1
    slug = `${slugBase}-${n}`
  }
  const existingUser = asRow(db.prepare("SELECT id FROM users WHERE email = ?").get(input.adminEmail))
  if (existingUser) return { ok: false as const, error: "That email already has a demo identity." }

  const tenantId = `t_${slug}`.slice(0, 40)
  const userId = crypto.randomUUID()
  db.prepare(
    "INSERT INTO tenants (id, name, slug, city, kind, is_demo) VALUES (?, ?, ?, ?, 'landlord', 0)",
  ).run(tenantId, input.companyName, slug, input.city)
  db.prepare(
    `INSERT INTO users (id, name, email, role, tenant_id, company, trade, service_area, provider_verified, is_demo)
     VALUES (?, ?, ?, 'landlord_admin', ?, NULL, NULL, NULL, 0, 0)`,
  ).run(userId, input.adminName, input.adminEmail, tenantId)
  db.prepare(
    "INSERT INTO late_fee_rules (tenant_id, grace_days, flat_cents, percent_bps) VALUES (?, 5, 1500000, 150)",
  ).run(tenantId)
  return { ok: true as const, tenantId, userId, companyName: input.companyName }
}

export function setProviderVerified(providerId: string, verified: boolean) {
  const row = asRow(
    getDb()
      .prepare("SELECT id FROM users WHERE id = ? AND role = 'service_provider'")
      .get(providerId),
  )
  if (!row) return { ok: false as const, error: "Provider not found." }
  getDb()
    .prepare("UPDATE users SET provider_verified = ? WHERE id = ?")
    .run(verified ? 1 : 0, providerId)
  return { ok: true as const }
}

export function landlordTenants() {
  return asRows(
    getDb()
      .prepare("SELECT id, name FROM tenants WHERE kind = 'landlord' ORDER BY name")
      .all(),
  ).map((row) => ({ id: String(row.id), name: String(row.name) }))
}

export type MarketChecklistItem = {
  key: MarketChecklistKey
  label: string
  done: boolean
  notes: string
}

export type MarketDraft = {
  id: string
  isoCode: string
  name: string
  createdAt: string
  updatedAt: string
  items: MarketChecklistItem[]
  complete: boolean
  doneCount: number
  totalCount: number
}

function mapDraft(row: Record<string, unknown>): MarketDraft {
  const id = String(row.id)
  const items = MARKET_CHECKLIST_KEYS.map((key) => {
    const item = asRow(
      getDb()
        .prepare(
          "SELECT done, notes FROM market_checklist_items WHERE draft_id = ? AND item_key = ?",
        )
        .get(id, key),
    )
    return {
      key,
      label: MARKET_CHECKLIST_LABELS[key],
      done: Number(item?.done ?? 0) === 1,
      notes: String(item?.notes ?? ""),
    }
  })
  const doneCount = items.filter((item) => item.done).length
  return {
    id,
    isoCode: String(row.iso_code),
    name: String(row.name),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    items,
    complete: doneCount === items.length,
    doneCount,
    totalCount: items.length,
  }
}

export function listMarketDrafts() {
  return asRows(
    getDb().prepare("SELECT * FROM market_drafts ORDER BY created_at DESC").all(),
  ).map(mapDraft)
}

export function getMarketDraft(id: string) {
  const row = asRow(getDb().prepare("SELECT * FROM market_drafts WHERE id = ?").get(id))
  return row ? mapDraft(row) : null
}

export function createMarketDraft(input: { isoCode: string; name: string }) {
  const iso = input.isoCode.trim().toUpperCase()
  const name = input.name.trim()
  if (!/^[A-Z]{2}$/.test(iso)) {
    return { ok: false as const, error: "Use a two-letter ISO 3166 country code." }
  }
  if (iso === LIVE_MARKET.iso) {
    return { ok: false as const, error: "India is already the live market." }
  }
  if (name.length < 2) {
    return { ok: false as const, error: "Enter a display name." }
  }
  const existing = asRow(getDb().prepare("SELECT id FROM market_drafts WHERE iso_code = ?").get(iso))
  if (existing) return { ok: false as const, error: "A draft for that country code already exists." }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const db = getDb()
  db.prepare(
    "INSERT INTO market_drafts (id, iso_code, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, iso, name, now, now)
  const insertItem = db.prepare(
    "INSERT INTO market_checklist_items (draft_id, item_key, done, notes) VALUES (?, ?, 0, '')",
  )
  for (const key of MARKET_CHECKLIST_KEYS) insertItem.run(id, key)
  return { ok: true as const, id }
}

export function setChecklistItem(
  draftId: string,
  itemKey: MarketChecklistKey,
  input: { done: boolean; notes: string },
) {
  const draft = getMarketDraft(draftId)
  if (!draft) return { ok: false as const, error: "Draft not found." }
  if (!MARKET_CHECKLIST_KEYS.includes(itemKey)) {
    return { ok: false as const, error: "Unknown checklist row." }
  }
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `UPDATE market_checklist_items SET done = ?, notes = ? WHERE draft_id = ? AND item_key = ?`,
    )
    .run(input.done ? 1 : 0, input.notes.trim(), draftId, itemKey)
  getDb().prepare("UPDATE market_drafts SET updated_at = ? WHERE id = ?").run(now, draftId)
  return { ok: true as const }
}

/**
 * Countries offered on public forms: live India plus drafts with every checklist row done.
 * Incomplete drafts never appear here.
 */
export function publicFormCountries(): { iso: string; name: string; live: boolean }[] {
  const ready = listMarketDrafts()
    .filter((draft) => draft.complete)
    .map((draft) => ({ iso: draft.isoCode, name: draft.name, live: false }))
  return [{ iso: LIVE_MARKET.iso, name: LIVE_MARKET.name, live: true }, ...ready]
}

export function isPublicFormCountry(nameOrIso: string) {
  const needle = nameOrIso.trim().toLowerCase()
  return publicFormCountries().some(
    (country) =>
      country.name.toLowerCase() === needle || country.iso.toLowerCase() === needle,
  )
}

export type LanguageRecord = {
  code: string
  name: string
  status: "ready" | "waiting_for_key"
  waitingReason: string | null
  createdAt: string
  updatedAt: string
}

export function listLanguages() {
  return asRows(
    getDb().prepare("SELECT * FROM languages ORDER BY CASE code WHEN 'en' THEN 0 ELSE 1 END, code").all(),
  ).map(
    (row): LanguageRecord => ({
      code: String(row.code),
      name: String(row.name),
      status: String(row.status) as LanguageRecord["status"],
      waitingReason: str(row, "waiting_reason"),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }),
  )
}

export function upsertLanguage(input: {
  code: string
  name: string
  status: "ready" | "waiting_for_key"
  waitingReason: string | null
}) {
  const code = input.code.trim().toLowerCase()
  const name = input.name.trim()
  if (!/^[a-z]{2}(-[a-z0-9]{2,8})?$/.test(code)) {
    return { ok: false as const, error: "Use a BCP 47 language code such as hi or fr." }
  }
  if (code === "en") {
    return { ok: false as const, error: "English is the source language and already exists." }
  }
  if (name.length < 2) return { ok: false as const, error: "Enter a display name." }
  const now = new Date().toISOString()
  const existing = asRow(getDb().prepare("SELECT code FROM languages WHERE code = ?").get(code))
  if (existing) {
    getDb()
      .prepare(
        `UPDATE languages SET name = ?, status = ?, waiting_reason = ?, updated_at = ? WHERE code = ?`,
      )
      .run(name, input.status, input.waitingReason, now, code)
  } else {
    getDb()
      .prepare(
        `INSERT INTO languages (code, name, status, waiting_reason, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(code, name, input.status, input.waitingReason, now, now)
  }
  return { ok: true as const, code }
}

// --- Occupant shop (PRD §15 / Slice G) ---

export type ShopSkuKind = "purchase" | "rental"
export type ShopOrderStatus =
  | "pending_payment"
  | "paid"
  | "fulfilling"
  | "completed"
  | "cancelled"
  | "refunded"

export type OccupantLease = {
  tenantId: string
  tenantName: string
  propertyId: string
  propertyName: string
  propertySlug: string
  unitId: string
  unitCode: string
  applicationId: string
}

export type ShopSkuRecord = {
  id: string
  tenantId: string
  propertyId: string | null
  name: string
  kind: ShopSkuKind
  priceCents: number
  enabled: boolean
  stock: number | null
  slotCapacity: number | null
  sortOrder: number
}

export type ShopCartLine = {
  id: string
  skuId: string
  name: string
  kind: ShopSkuKind
  qty: number
  unitPriceCents: number
  slotStart: string | null
  lineCents: number
}

export type ShopSettingsPublic = {
  tenantId: string
  enabled: boolean
  demoMode: boolean
  razorpayMode: "test" | "live"
  keyId: string | null
  hasSecret: boolean
  secretLast4: string | null
}

export type ShopOrderRecord = {
  id: string
  tenantId: string
  propertyId: string | null
  userId: string
  userName: string
  status: ShopOrderStatus
  amountCents: number
  paymentProvider: string
  paymentRef: string | null
  note: string
  createdAt: string
  paidAt: string | null
  lines: {
    id: string
    skuId: string
    skuName: string
    kind: ShopSkuKind
    qty: number
    unitPriceCents: number
    slotStart: string | null
  }[]
}

/** Active leases = approved applications (occupant portal gate for /shop). */
export function leasesForOccupant(userId: string): OccupantLease[] {
  return asRows(
    getDb()
      .prepare(
        `SELECT a.id AS application_id, a.tenant_id, t.name AS tenant_name,
                p.id AS property_id, p.name AS property_name, p.slug AS property_slug,
                u.id AS unit_id, u.code AS unit_code
         FROM applications a
         JOIN tenants t ON t.id = a.tenant_id
         JOIN units u ON u.id = a.unit_id
         JOIN properties p ON p.id = u.property_id
         WHERE a.applicant_id = ? AND a.status = 'approved'
         ORDER BY a.created_at`,
      )
      .all(userId),
  ).map((row) => ({
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name),
    propertyId: String(row.property_id),
    propertyName: String(row.property_name),
    propertySlug: String(row.property_slug),
    unitId: String(row.unit_id),
    unitCode: String(row.unit_code),
    applicationId: String(row.application_id),
  }))
}

function mapSku(row: Record<string, unknown>): ShopSkuRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    propertyId: str(row, "property_id"),
    name: String(row.name),
    kind: String(row.kind) as ShopSkuKind,
    priceCents: Number(row.price_cents),
    enabled: Number(row.enabled) === 1,
    stock: num(row, "stock"),
    slotCapacity: num(row, "slot_capacity"),
    sortOrder: Number(row.sort_order),
  }
}

function ensureShopSettings(tenantId: string) {
  const existing = asRow(
    getDb().prepare("SELECT tenant_id FROM shop_settings WHERE tenant_id = ?").get(tenantId),
  )
  if (existing) return
  getDb()
    .prepare(
      `INSERT INTO shop_settings (tenant_id, enabled, demo_mode, razorpay_key_id, razorpay_key_secret_enc, razorpay_mode)
       VALUES (?, 1, 1, NULL, NULL, 'test')`,
    )
    .run(tenantId)
}

export function getShopSettingsPublic(tenantId: string): ShopSettingsPublic {
  ensureShopSettings(tenantId)
  const row = asRow(getDb().prepare("SELECT * FROM shop_settings WHERE tenant_id = ?").get(tenantId))
  if (!row) {
    return {
      tenantId,
      enabled: true,
      demoMode: true,
      razorpayMode: "test",
      keyId: null,
      hasSecret: false,
      secretLast4: null,
    }
  }
  const enc = str(row, "razorpay_key_secret_enc")
  let last4: string | null = null
  if (enc) {
    const plain = decryptSecret(enc)
    last4 = plain ? secretLast4(plain) : "••••"
  }
  return {
    tenantId,
    enabled: Number(row.enabled) === 1,
    demoMode: Number(row.demo_mode) === 1,
    razorpayMode: (str(row, "razorpay_mode") as "test" | "live") ?? "test",
    keyId: str(row, "razorpay_key_id"),
    hasSecret: Boolean(enc),
    secretLast4: last4,
  }
}

/** Server-only: never expose to client serializers. */
export function getShopSettingsInternal(tenantId: string) {
  ensureShopSettings(tenantId)
  const row = asRow(getDb().prepare("SELECT * FROM shop_settings WHERE tenant_id = ?").get(tenantId))
  const enc = row ? str(row, "razorpay_key_secret_enc") : null
  return {
    tenantId,
    enabled: row ? Number(row.enabled) === 1 : true,
    demoMode: row ? Number(row.demo_mode) === 1 : true,
    razorpayMode: (row ? (str(row, "razorpay_mode") as "test" | "live") : "test") ?? "test",
    keyId: row ? str(row, "razorpay_key_id") : null,
    secretEnc: enc,
    hasSecret: Boolean(enc),
  }
}

export function saveShopRazorpaySettings(
  tenantId: string,
  input: {
    keyId: string | null
    keySecret: string | null
    demoMode: boolean
    razorpayMode: "test" | "live"
    enabled: boolean
  },
) {
  ensureShopSettings(tenantId)
  const current = getShopSettingsInternal(tenantId)
  let secretEnc = current.secretEnc
  if (input.keySecret && input.keySecret.trim().length > 0) {
    secretEnc = encryptSecret(input.keySecret.trim())
  }
  const keyId =
    input.keyId != null && input.keyId.trim().length > 0 ? input.keyId.trim() : current.keyId
  getDb()
    .prepare(
      `UPDATE shop_settings
       SET enabled = ?, demo_mode = ?, razorpay_key_id = ?, razorpay_key_secret_enc = ?, razorpay_mode = ?
       WHERE tenant_id = ?`,
    )
    .run(
      input.enabled ? 1 : 0,
      input.demoMode ? 1 : 0,
      keyId,
      secretEnc,
      input.razorpayMode,
      tenantId,
    )
  return getShopSettingsPublic(tenantId)
}

export function listShopSkus(tenantId: string, opts?: { enabledOnly?: boolean; propertyId?: string }) {
  const enabledOnly = opts?.enabledOnly ?? false
  const rows = asRows(
    getDb()
      .prepare(
        `SELECT * FROM shop_skus WHERE tenant_id = ?
         ORDER BY sort_order, name`,
      )
      .all(tenantId),
  )
    .map(mapSku)
    .filter((sku) => {
      if (enabledOnly && !sku.enabled) return false
      if (opts?.propertyId && sku.propertyId && sku.propertyId !== opts.propertyId) return false
      return true
    })
  return rows
}

export function setShopSkuEnabled(tenantId: string, skuId: string, enabled: boolean) {
  const row = asRow(
    getDb().prepare("SELECT id FROM shop_skus WHERE id = ? AND tenant_id = ?").get(skuId, tenantId),
  )
  if (!row) return { ok: false as const, error: "SKU not found for this organisation." }
  getDb().prepare("UPDATE shop_skus SET enabled = ? WHERE id = ? AND tenant_id = ?").run(
    enabled ? 1 : 0,
    skuId,
    tenantId,
  )
  return { ok: true as const }
}

export function cartForUser(userId: string, tenantId: string): ShopCartLine[] {
  return asRows(
    getDb()
      .prepare(
        `SELECT c.id, c.sku_id, c.qty, c.slot_start, s.name, s.kind, s.price_cents
         FROM shop_cart_items c
         JOIN shop_skus s ON s.id = c.sku_id
         WHERE c.user_id = ? AND c.tenant_id = ?
         ORDER BY s.sort_order, s.name`,
      )
      .all(userId, tenantId),
  ).map((row) => {
    const qty = Number(row.qty)
    const unit = Number(row.price_cents)
    return {
      id: String(row.id),
      skuId: String(row.sku_id),
      name: String(row.name),
      kind: String(row.kind) as ShopSkuKind,
      qty,
      unitPriceCents: unit,
      slotStart: str(row, "slot_start"),
      lineCents: qty * unit,
    }
  })
}

export function addToCart(input: {
  userId: string
  tenantId: string
  skuId: string
  qty: number
  slotStart: string | null
}) {
  const lease = leasesForOccupant(input.userId).find((l) => l.tenantId === input.tenantId)
  if (!lease) {
    return { ok: false as const, error: "Shop is for current occupants." }
  }
  const settings = getShopSettingsInternal(input.tenantId)
  if (!settings.enabled) {
    return { ok: false as const, error: "This landlord has disabled the shop." }
  }
  const skuRow = asRow(
    getDb()
      .prepare("SELECT * FROM shop_skus WHERE id = ? AND tenant_id = ? AND enabled = 1")
      .get(input.skuId, input.tenantId),
  )
  if (!skuRow) return { ok: false as const, error: "That item is not available." }
  const sku = mapSku(skuRow)
  if (sku.kind === "rental") {
    if (!input.slotStart) {
      return { ok: false as const, error: "Pick a time slot for this rental." }
    }
    const taken = asRow(
      getDb()
        .prepare(
          `SELECT id FROM shop_rental_bookings
           WHERE sku_id = ? AND slot_start = ? AND status != 'cancelled'`,
        )
        .get(sku.id, input.slotStart),
    )
    if (taken) {
      return { ok: false as const, error: "That slot is already booked." }
    }
  }
  const qty = Math.max(1, Math.min(99, Math.floor(input.qty) || 1))
  const slot = sku.kind === "rental" ? input.slotStart : null
  const existing = asRow(
    getDb()
      .prepare(
        `SELECT id, qty FROM shop_cart_items
         WHERE user_id = ? AND tenant_id = ? AND sku_id = ?
           AND ((slot_start IS NULL AND ? IS NULL) OR slot_start = ?)`,
      )
      .get(input.userId, input.tenantId, sku.id, slot, slot),
  )
  if (existing) {
    getDb()
      .prepare("UPDATE shop_cart_items SET qty = ? WHERE id = ?")
      .run(Number(existing.qty) + qty, String(existing.id))
  } else {
    getDb()
      .prepare(
        `INSERT INTO shop_cart_items (id, user_id, tenant_id, sku_id, qty, slot_start)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(crypto.randomUUID(), input.userId, input.tenantId, sku.id, qty, slot)
  }
  return { ok: true as const }
}

export function clearCart(userId: string, tenantId: string) {
  getDb()
    .prepare("DELETE FROM shop_cart_items WHERE user_id = ? AND tenant_id = ?")
    .run(userId, tenantId)
}

export function checkoutCart(input: {
  userId: string
  tenantId: string
  note: string
}) {
  const lease = leasesForOccupant(input.userId).find((l) => l.tenantId === input.tenantId)
  if (!lease) {
    return { ok: false as const, error: "Shop is for current occupants." }
  }
  const settings = getShopSettingsInternal(input.tenantId)
  if (!settings.enabled) {
    return { ok: false as const, error: "This landlord has disabled the shop." }
  }
  const lines = cartForUser(input.userId, input.tenantId)
  if (lines.length === 0) {
    return { ok: false as const, error: "Cart is empty." }
  }
  for (const line of lines) {
    if (line.kind === "rental" && line.slotStart) {
      const taken = asRow(
        getDb()
          .prepare(
            `SELECT id FROM shop_rental_bookings
             WHERE sku_id = ? AND slot_start = ? AND status != 'cancelled'`,
          )
          .get(line.skuId, line.slotStart),
      )
      if (taken) {
        return {
          ok: false as const,
          error: `Slot conflict for ${line.name}. Pick another time.`,
        }
      }
    }
  }

  const provider = resolveShopPaymentProvider({
    demoMode: settings.demoMode,
    hasSecret: settings.hasSecret,
    keyId: settings.keyId,
  })

  const amountCents = lines.reduce((sum, line) => sum + line.lineCents, 0)
  const orderId = crypto.randomUUID()
  const now = new Date().toISOString()
  const pay = provider.createOrder({
    tenantId: input.tenantId,
    orderId,
    amountCents,
    description: `Shop order ${orderId.slice(0, 8)}`,
  })

  try {
    transaction((tx) => {
      tx.prepare(
        `INSERT INTO shop_orders (
          id, tenant_id, property_id, user_id, status, amount_cents,
          payment_provider, payment_ref, note, created_at, paid_at
        ) VALUES (?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?)`,
      ).run(
        orderId,
        input.tenantId,
        lease.propertyId,
        input.userId,
        amountCents,
        pay.provider,
        pay.reference,
        input.note.trim(),
        now,
        now,
      )
      const lineIns = tx.prepare(
        `INSERT INTO shop_order_lines (
          id, order_id, sku_id, sku_name, kind, qty, unit_price_cents, slot_start
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      const bookIns = tx.prepare(
        `INSERT INTO shop_rental_bookings (
          id, tenant_id, sku_id, order_id, slot_start, user_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'booked')`,
      )
      for (const line of lines) {
        lineIns.run(
          crypto.randomUUID(),
          orderId,
          line.skuId,
          line.name,
          line.kind,
          line.qty,
          line.unitPriceCents,
          line.slotStart,
        )
        if (line.kind === "rental" && line.slotStart) {
          bookIns.run(
            crypto.randomUUID(),
            input.tenantId,
            line.skuId,
            orderId,
            line.slotStart,
            input.userId,
          )
        }
      }
      tx.prepare("DELETE FROM shop_cart_items WHERE user_id = ? AND tenant_id = ?").run(
        input.userId,
        input.tenantId,
      )
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("UNIQUE") || message.includes("constraint")) {
      return { ok: false as const, error: "That rental slot was just taken. Try another time." }
    }
    throw error
  }

  return {
    ok: true as const,
    orderId,
    amountCents,
    paymentProvider: pay.provider,
    paymentRef: pay.reference,
    labelledDemo: pay.labelledDemo,
  }
}

function mapOrder(row: Record<string, unknown>): ShopOrderRecord {
  const id = String(row.id)
  const lines = asRows(
    getDb().prepare("SELECT * FROM shop_order_lines WHERE order_id = ?").all(id),
  ).map((line) => ({
    id: String(line.id),
    skuId: String(line.sku_id),
    skuName: String(line.sku_name),
    kind: String(line.kind) as ShopSkuKind,
    qty: Number(line.qty),
    unitPriceCents: Number(line.unit_price_cents),
    slotStart: str(line, "slot_start"),
  }))
  return {
    id,
    tenantId: String(row.tenant_id),
    propertyId: str(row, "property_id"),
    userId: String(row.user_id),
    userName: String(row.user_name ?? ""),
    status: String(row.status) as ShopOrderStatus,
    amountCents: Number(row.amount_cents),
    paymentProvider: String(row.payment_provider),
    paymentRef: str(row, "payment_ref"),
    note: String(row.note ?? ""),
    createdAt: String(row.created_at),
    paidAt: str(row, "paid_at"),
    lines,
  }
}

export function ordersForOccupant(userId: string) {
  return asRows(
    getDb()
      .prepare(
        `SELECT o.*, u.name AS user_name
         FROM shop_orders o
         JOIN users u ON u.id = o.user_id
         WHERE o.user_id = ?
         ORDER BY o.created_at DESC`,
      )
      .all(userId),
  ).map(mapOrder)
}

export function ordersForTenant(tenantId: string) {
  return asRows(
    getDb()
      .prepare(
        `SELECT o.*, u.name AS user_name
         FROM shop_orders o
         JOIN users u ON u.id = o.user_id
         WHERE o.tenant_id = ?
         ORDER BY o.created_at DESC`,
      )
      .all(tenantId),
  ).map(mapOrder)
}

/** Test helper: book a rental slot directly (simulates prior order). */
export function forceBookRentalSlot(input: {
  tenantId: string
  skuId: string
  slotStart: string
  userId: string
}) {
  getDb()
    .prepare(
      `INSERT INTO shop_rental_bookings (
        id, tenant_id, sku_id, order_id, slot_start, user_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'booked')`,
    )
    .run(
      crypto.randomUUID(),
      input.tenantId,
      input.skuId,
      `seed_${crypto.randomUUID()}`,
      input.slotStart,
      input.userId,
    )
}


import "server-only"
import fs from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import {
  addDays,
  firstOfNextMonth,
  lateFeeCents,
  monthlyRentCents,
  todayISO,
  type ApplicationStatus,
  type JobStatus,
  type Role,
  type Trade,
  type UnitStatus,
} from "@/lib/format"
import { gstCents, type DisplayCurrency } from "@/lib/market"
import {
  LIVE_MARKET,
  MARKET_CHECKLIST_KEYS,
  MARKET_CHECKLIST_LABELS,
  type MarketChecklistKey,
} from "@/lib/market-checklist"

const SEED_VERSION = "7"

function dbPath() {
  return process.env.DESKULPT_DB_PATH || path.join(process.cwd(), "data", "deskulpt.sqlite")
}

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
  phone: string | null
  displayCurrency: DisplayCurrency
}

export type UnitRecord = {
  id: string
  tenantId: string
  propertyId: string
  code: string
  sqft: number
  clearHeight: string
  docks: number
  driveIns: number
  power: string
  ratePsf: number
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
  floorPlanPath: string | null
  latitude: number | null
  longitude: number | null
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
    phone: str(row, "phone"),
    displayCurrency: (str(row, "display_currency") as DisplayCurrency | null) ?? "INR",
  }
}

function mapUnit(row: Record<string, unknown>): UnitRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    propertyId: String(row.property_id),
    code: String(row.code),
    sqft: Number(row.sqft),
    clearHeight: String(row.clear_height),
    docks: Number(row.docks),
    driveIns: Number(row.drive_ins),
    power: String(row.power),
    ratePsf: Number(row.rate_psf),
    status: String(row.status) as UnitStatus,
    hotspotX: num(row, "hotspot_x"),
    hotspotY: num(row, "hotspot_y"),
    matterportUrl: str(row, "matterport_url"),
    description: String(row.description),
  }
}

const USER_SQL = `
  SELECT u.id, u.name, u.email, u.role, u.tenant_id, u.company, u.trade,
         u.service_area, u.provider_verified, u.phone, t.name AS tenant_name,
         t.kind AS tenant_kind, COALESCE(t.display_currency, 'INR') AS display_currency
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
      display_currency TEXT NOT NULL DEFAULT 'INR'
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      tenant_id TEXT,
      company TEXT,
      trade TEXT,
      service_area TEXT,
      provider_verified INTEGER NOT NULL DEFAULT 0,
      phone TEXT
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
      floor_plan_path TEXT,
      latitude REAL,
      longitude REAL
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
      code TEXT NOT NULL,
      sqft INTEGER NOT NULL,
      clear_height TEXT NOT NULL,
      docks INTEGER NOT NULL,
      drive_ins INTEGER NOT NULL,
      power TEXT NOT NULL,
      rate_psf REAL NOT NULL,
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
    CREATE INDEX idx_units_tenant ON units(tenant_id);
    CREATE INDEX idx_units_property ON units(property_id);
    CREATE INDEX idx_apps_tenant ON applications(tenant_id, status);
    CREATE INDEX idx_apps_applicant ON applications(applicant_id);
    CREATE INDEX idx_jobs_tenant ON jobs(tenant_id, status);
    CREATE INDEX idx_jobs_provider ON jobs(provider_id);
    CREATE INDEX idx_ledger_tenant ON ledger_entries(tenant_id);
    CREATE INDEX idx_ledger_user ON ledger_entries(user_id);
    CREATE INDEX idx_notes_user ON notifications(user_id, created_at);
    CREATE INDEX idx_properties_tenant ON properties(tenant_id);
    CREATE INDEX idx_media_unit ON unit_media(unit_id, sort_order);
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
    "unit_media",
    "units",
    "properties",
    "provider_approvals",
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

type UnitSeed = {
  code: string
  sqft: number
  h: string
  dock: number
  drive: number
  pwr: string
  rate: number
  status: UnitStatus
  x: number
  y: number
}

function seed(db: Sql) {
  const tenant = db.prepare(
    "INSERT INTO tenants (id, name, slug, city, kind, display_currency) VALUES (?, ?, ?, ?, ?, ?)",
  )
  tenant.run("t_deskulpt", "DeSkulpt India Pvt Ltd", "deskulpt", "Bengaluru", "platform", "INR")
  tenant.run("t_bbm", "BBM Logistics Parks", "bbm-parks", "Mumbai", "landlord", "INR")
  tenant.run("t_harbour", "Harbourline Yards India", "harbourline-india", "Chennai", "landlord", "INR")
  tenant.run("t_nri", "Sahni Global Realty (NRI)", "sahni-global", "Dubai / Mumbai", "landlord", "USD")

  const user = db.prepare(
    `INSERT INTO users (id, name, email, role, tenant_id, company, trade, service_area, provider_verified, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  user.run("u_avery", "Avery Quinn", "avery@deskulpt.example", "super_admin", "t_deskulpt", "DeSkulpt India Pvt Ltd", null, null, 0, "+918012345678")
  user.run("u_sam", "Sam Rivera", "sam@deskulpt.example", "account_manager", "t_deskulpt", "DeSkulpt India Pvt Ltd", null, null, 0, "+918012345679")
  user.run("u_priya", "Priya Nair", "priya@deskulpt.example", "service_manager", "t_deskulpt", "DeSkulpt India Pvt Ltd", null, null, 0, "+919845551122")
  user.run("u_chris", "Chris Vogel", "chris@deskulpt.example", "property_manager", "t_deskulpt", "DeSkulpt India Pvt Ltd", null, null, 0, "+918022334455")
  user.run("u_jordan", "Jordan Blake", "jordan@deskulpt.example", "merchandiser", "t_deskulpt", "DeSkulpt India Pvt Ltd", null, null, 0, "+919900112233")
  user.run("u_maya", "Maya Chen", "maya@apexlogistics.example", "applicant", null, "Apex Logistics India", null, null, 0, "+919876543210")
  user.run("u_devon", "Devon Hale", "devon@northline.example", "applicant", null, "Northline Distribution India", null, null, 0, "+919811223344")
  user.run("u_nadia", "Nadia Okonkwo", "nadia@bbmparks.example", "landlord_admin", "t_bbm", null, null, null, 0, "+912240012345")
  user.run("u_jonah", "Jonah Ellis", "jonah@harbourline.example", "landlord_admin", "t_harbour", null, null, null, 0, "+914440056789")
  user.run("u_meera", "Meera Sahni", "meera@sahniglobal.example", "landlord_admin", "t_nri", null, null, null, 0, "+14155550198")
  user.run("u_luis", "Luis Ortega", "luis@ortegaelectric.example", "service_provider", null, null, "electrician", "Bhiwandi", 1, "+919820011122")
  user.run("u_rosa", "Rosa Delgado", "rosa@clearbay.example", "service_provider", null, null, "cleaning", "Bhiwandi", 1, "+919820011133")
  user.run("u_kei", "Kei Watanabe", "kei@lanterncourier.example", "service_provider", null, null, "courier", "Bhiwandi", 1, "+919820011144")
  user.run("u_hana", "Hana Berger", "hana@bergerpower.example", "service_provider", null, null, "electrician", "Whitefield", 1, "+919845667788")
  user.run("u_amrita", "Amrita Singh", "amrita@southplumbers.example", "service_provider", null, null, "plumber", "Sriperumbudur", 1, "+919444556677")
  user.run("u_idris", "Idris Cole", "idris@coleelectric.example", "service_provider", null, null, "electrician", "Sriperumbudur", 1, "+919444556688")

  const approval = db.prepare(
    "INSERT INTO provider_approvals (tenant_id, user_id, status) VALUES (?, ?, ?)",
  )
  approval.run("t_bbm", "u_luis", "approved")
  approval.run("t_bbm", "u_rosa", "approved")
  approval.run("t_bbm", "u_kei", "pending")
  approval.run("t_bbm", "u_hana", "pending")
  approval.run("t_harbour", "u_amrita", "approved")
  approval.run("t_harbour", "u_idris", "pending")

  const property = db.prepare(
    `INSERT INTO properties (
      id, tenant_id, name, slug, address, area, city_line, total_sqft, floor_plan_path, latitude, longitude
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  // Gate pins are approximate public coords for demo Leaflet embeds (no Mapbox key).
  property.run("p_waterman", "t_bbm", "BBM Bhiwandi Hub", "waterman", "Plot 19, Kalyan-Bhiwandi Road, Bhiwandi, Maharashtra 421302", "Bhiwandi", "BHIWANDI · PIN 421302 · 214,000 SF", 214000, "/floorplans/waterman.svg", 19.2813, 73.0483)
  property.run("p_bartley", "t_bbm", "BBM Whitefield Sheds", "bartley", "161 ITPL Main Road, Whitefield, Bengaluru, Karnataka 560066", "Whitefield", "WHITEFIELD · PIN 560066 · 96,000 SF", 96000, "/floorplans/bartley.svg", 12.9698, 77.75)
  property.run("p_cranfield", "t_bbm", "BBM Andheri East", "cranfield", "12 MIDC Central Road, Andheri East, Mumbai, Maharashtra 400093", "Andheri East", "ANDHERI EAST · PIN 400093 · 74,500 SF", 74500, "/floorplans/cranfield.svg", 19.1136, 72.8697)
  property.run("p_commissioners", "t_harbour", "Harbourline Sriperumbudur", "commissioners", "88 SIPCOT Industrial Park, Sriperumbudur, Tamil Nadu 602105", "Sriperumbudur", "SRIPERUMBUDUR · PIN 602105 · 86,000 SF", 86000, "/floorplans/commissioners.svg", 12.9675, 79.9473)
  property.run("p_nri_thane", "t_nri", "Sahni Thane Warehouse", "thane", "45 Wagle Estate, Thane West, Maharashtra 400604", "Thane", "THANE · PIN 400604 · 42,000 SF", 42000, "/floorplans/cranfield.svg", 19.2183, 72.9781)

  const unitStmt = db.prepare(
    `INSERT INTO units (
      id, tenant_id, property_id, code, sqft, clear_height, docks, drive_ins, power,
      rate_psf, status, hotspot_x, hotspot_y, matterport_url, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  /**
   * Public Matterport showcase models — iframe src only (PRD SaaS §4.6).
   * IDs: PmWtWjyqpJs (B1), VpGQDT9DFjr (A2), caFmhpiUXSc (C2),
   * 7Fdpg6tCFwu (H1), U5p62iYcxeY (U1). Discover pages are not stored.
   */
  const MATTERPORTS: Record<string, string> = {
    "waterman:B1": "https://my.matterport.com/show/?m=PmWtWjyqpJs",
    "waterman:A2": "https://my.matterport.com/show/?m=VpGQDT9DFjr",
    "waterman:C2": "https://my.matterport.com/show/?m=caFmhpiUXSc",
    "commissioners:H1": "https://my.matterport.com/show/?m=7Fdpg6tCFwu",
    "cranfield:U1": "https://my.matterport.com/show/?m=U5p62iYcxeY",
  }

  function addUnits(
    tenantId: string,
    propertyId: string,
    propertyName: string,
    slug: string,
    units: UnitSeed[],
  ) {
    for (const unit of units) {
      const key = `${slug}:${unit.code}`
      const walk = MATTERPORTS[key] ?? null
      const rich = key === "waterman:B1"
      unitStmt.run(
        `u_${slug}_${unit.code.toLowerCase()}`,
        tenantId,
        propertyId,
        unit.code,
        unit.sqft,
        unit.h,
        unit.dock,
        unit.drive,
        unit.pwr,
        unit.rate,
        unit.status,
        unit.x,
        unit.y,
        walk,
        rich
          ? "Flagship bay at BBM Bhiwandi Hub. Clear-span distribution with stills, motion, 360, and a live Matterport walkthrough embed."
          : `${unit.sqft.toLocaleString("en-IN")} SF bay at ${propertyName}. ${unit.h} clear, ${unit.dock} dock door${unit.dock === 1 ? "" : "s"}, ${unit.drive} drive-in, ${unit.pwr}.${walk ? " Matterport walkthrough on file." : ""}`,
      )
    }
  }

  addUnits("t_bbm", "p_waterman", "BBM Bhiwandi Hub", "waterman", [
    { code: "A1", sqft: 38500, h: "28'", dock: 6, drive: 1, pwr: "600A / 415V", rate: 52, status: "leased", x: 22, y: 38 },
    { code: "A2", sqft: 24200, h: "26'", dock: 4, drive: 1, pwr: "400A / 415V", rate: 55, status: "available", x: 46, y: 38 },
    { code: "B1", sqft: 52000, h: "30'", dock: 8, drive: 2, pwr: "800A / 415V", rate: 48, status: "available", x: 22, y: 68 },
    { code: "B2", sqft: 18900, h: "24'", dock: 3, drive: 1, pwr: "400A / 415V", rate: 58, status: "pending", x: 46, y: 68 },
    { code: "C1", sqft: 31600, h: "28'", dock: 5, drive: 1, pwr: "600A / 415V", rate: 50, status: "leased", x: 74, y: 38 },
    { code: "C2", sqft: 28800, h: "28'", dock: 5, drive: 2, pwr: "600A / 415V", rate: 51, status: "available", x: 74, y: 68 },
  ])
  addUnits("t_bbm", "p_bartley", "BBM Whitefield Sheds", "bartley", [
    { code: "01", sqft: 12400, h: "22'", dock: 2, drive: 1, pwr: "200A / 415V", rate: 72, status: "available", x: 22, y: 40 },
    { code: "02", sqft: 21000, h: "24'", dock: 4, drive: 1, pwr: "400A / 415V", rate: 68, status: "leased", x: 46, y: 40 },
    { code: "03", sqft: 16800, h: "24'", dock: 3, drive: 1, pwr: "400A / 415V", rate: 70, status: "pending", x: 74, y: 40 },
    { code: "04", sqft: 30200, h: "26'", dock: 5, drive: 2, pwr: "600A / 415V", rate: 65, status: "available", x: 34, y: 70 },
    { code: "05", sqft: 15600, h: "22'", dock: 2, drive: 1, pwr: "200A / 415V", rate: 74, status: "leased", x: 68, y: 70 },
  ])
  addUnits("t_bbm", "p_cranfield", "BBM Andheri East", "cranfield", [
    { code: "U1", sqft: 9800, h: "20'", dock: 1, drive: 1, pwr: "200A / 415V", rate: 95, status: "available", x: 24, y: 42 },
    { code: "U2", sqft: 14500, h: "22'", dock: 2, drive: 1, pwr: "400A / 415V", rate: 88, status: "leased", x: 50, y: 42 },
    { code: "U3", sqft: 22300, h: "26'", dock: 4, drive: 2, pwr: "600A / 415V", rate: 82, status: "available", x: 28, y: 72 },
    { code: "U4", sqft: 27900, h: "26'", dock: 4, drive: 1, pwr: "600A / 415V", rate: 80, status: "leased", x: 62, y: 72 },
  ])
  addUnits("t_harbour", "p_commissioners", "Harbourline Sriperumbudur", "commissioners", [
    { code: "H1", sqft: 22000, h: "28'", dock: 4, drive: 1, pwr: "600A / 415V", rate: 42, status: "available", x: 28, y: 40 },
    { code: "H2", sqft: 18000, h: "24'", dock: 3, drive: 1, pwr: "400A / 415V", rate: 45, status: "leased", x: 62, y: 40 },
    { code: "H3", sqft: 31000, h: "30'", dock: 6, drive: 2, pwr: "800A / 415V", rate: 40, status: "pending", x: 28, y: 70 },
    { code: "H4", sqft: 15000, h: "22'", dock: 2, drive: 1, pwr: "400A / 415V", rate: 46, status: "available", x: 62, y: 70 },
  ])
  addUnits("t_nri", "p_nri_thane", "Sahni Thane Warehouse", "thane", [
    { code: "T1", sqft: 22000, h: "26'", dock: 4, drive: 1, pwr: "600A / 415V", rate: 78, status: "available", x: 35, y: 45 },
    { code: "T2", sqft: 20000, h: "24'", dock: 3, drive: 1, pwr: "400A / 415V", rate: 80, status: "leased", x: 65, y: 55 },
  ])

  const media = db.prepare(
    `INSERT INTO unit_media (id, tenant_id, unit_id, kind, url, caption, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  const b1 = "u_waterman_b1"
  media.run("m1", "t_bbm", b1, "photo", "/media/b1-dock.jpg", "Dock approach", 1)
  media.run("m2", "t_bbm", b1, "photo", "/media/b1-aisle.jpg", "Rack aisle", 2)
  media.run("m3", "t_bbm", b1, "photo", "/media/b1-yard.jpg", "Yard and trailer positions", 3)
  media.run("m3b", "t_bbm", b1, "photo", "/media/gen-clearspan.jpg", "Clear-span volume", 4)
  media.run("m4", "t_bbm", b1, "gif", "/media/b1-loop.gif", "Motion loop across the bay stills", 5)
  media.run("m5", "t_bbm", b1, "video", "/media/b1-walk.mp4", "Short walk-through clip", 6)
  media.run("m6", "t_bbm", b1, "pano", "/media/b1-pano.jpg", "Equirectangular 360 photo — drag to look around", 7)

  // Cover stills across the catalogue (AI + stock CRE photography)
  const covers: [string, string, string, string, string][] = [
    ["m_a2a", "t_bbm", "u_waterman_a2", "/media/gen-aisle.jpg", "Aisle perspective"],
    ["m_a2b", "t_bbm", "u_waterman_a2", "/media/gen-dock.jpg", "Dock line"],
    ["m_c2a", "t_bbm", "u_waterman_c2", "/media/us-warehouse2.jpg", "Bay interior"],
    ["m_01a", "t_bbm", "u_bartley_01", "/media/gen-exterior.jpg", "Park exterior"],
    ["m_01b", "t_bbm", "u_bartley_01", "/media/gen-office.jpg", "Office mezzanine entry"],
    ["m_04a", "t_bbm", "u_bartley_04", "/media/gen-yard.jpg", "Trailer yard"],
    ["m_u1a", "t_bbm", "u_cranfield_u1", "/media/us-dock.jpg", "Urban dock apron"],
    ["m_u3a", "t_bbm", "u_cranfield_u3", "/media/gen-clearspan.jpg", "Clear height study"],
    ["m_u3b", "t_bbm", "u_cranfield_u3", "/media/us-yard.jpg", "Site apron"],
    ["m_h1a", "t_harbour", "u_commissioners_h1", "/media/us-warehouse1.jpg", "Rack hall"],
    ["m_h1b", "t_harbour", "u_commissioners_h1", "/media/gen-dock.jpg", "Dock doors"],
    ["m_h4a", "t_harbour", "u_commissioners_h4", "/media/gen-aisle.jpg", "Circulation aisle"],
    ["m_t1a", "t_nri", "u_thane_t1", "/media/gen-exterior.jpg", "Thane warehouse face"],
    ["m_t1b", "t_nri", "u_thane_t1", "/media/gen-office.jpg", "Front office"],
  ]
  covers.forEach(([id, tenantId, unitId, url, caption], index) => {
    media.run(id, tenantId, unitId, "photo", url, caption, index + 1)
  })

  db.prepare(
    `INSERT INTO applications (
      id, tenant_id, unit_id, applicant_id, company, contact_name, email, intended_use, notes, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "app_devon",
    "t_bbm",
    "u_waterman_a1",
    "u_devon",
    "Northline Distribution India",
    "Devon Hale",
    "devon@northline.example",
    "Regional distribution and cross-dock for West India",
    "GSTIN and insurance certificate on file in the demo vault.",
    "approved",
    "2026-03-12T15:00:00.000Z",
  )
  db.prepare(
    `INSERT INTO applications (
      id, tenant_id, unit_id, applicant_id, company, contact_name, email, intended_use, notes, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "app_maya",
    "t_bbm",
    "u_waterman_b2",
    "u_maya",
    "Apex Logistics India",
    "Maya Chen",
    "maya@apexlogistics.example",
    "Last-mile parcel sortation for MMR",
    "Looking for a September occupancy. Trailer pool of 12. PIN 400001 billing.",
    "submitted",
    "2026-09-18T14:30:00.000Z",
  )

  db.prepare(
    `INSERT INTO verifications (
      id, user_id, country, region, doc_type, file_name, face_name, simulated_score, simulated_result, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "v_devon",
    "u_devon",
    "India",
    "Maharashtra",
    "aadhaar",
    "demo-aadhaar.pdf",
    "demo-face.jpg",
    0.94,
    "match",
    "2026-03-02T18:00:00.000Z",
  )

  db.prepare(
    "INSERT INTO late_fee_rules (tenant_id, grace_days, flat_cents, percent_bps) VALUES (?, ?, ?, ?)",
  ).run("t_bbm", 5, 2500000, 150)
  db.prepare(
    "INSERT INTO late_fee_rules (tenant_id, grace_days, flat_cents, percent_bps) VALUES (?, ?, ?, ?)",
  ).run("t_harbour", 3, 1000000, 200)
  db.prepare(
    "INSERT INTO late_fee_rules (tenant_id, grace_days, flat_cents, percent_bps) VALUES (?, ?, ?, ?)",
  ).run("t_nri", 5, 2000000, 150)

  db.prepare(
    `INSERT INTO payment_methods (id, user_id, tenant_id, brand, last4, autopay, provider_ref)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "pm_devon",
    "u_devon",
    "t_bbm",
    "eNACH / auto-debit (demo)",
    "4821",
    1,
    "demo_enach_4821_t_bbm",
  )

  const a1 = db.prepare("SELECT sqft, rate_psf FROM units WHERE id = ?").get("u_waterman_a1") as {
    sqft: number
    rate_psf: number
  }
  const rent = monthlyRentCents(a1.rate_psf, a1.sqft)
  const gst = gstCents(rent)
  const fee = lateFeeCents(rent, { flatCents: 2500000, percentBps: 150 })
  const ledger = db.prepare(
    `INSERT INTO ledger_entries (
      id, tenant_id, unit_id, user_id, kind, description, amount_cents, status, due_on, created_at, source_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  ledger.run("led_jun_rent", "t_bbm", "u_waterman_a1", "u_devon", "rent", "June rent · Unit A1", rent, "paid", "2026-06-01", "2026-06-01T12:00:00.000Z", null)
  ledger.run("led_jun_gst", "t_bbm", "u_waterman_a1", "u_devon", "gst", "GST (18%) · June rent · Unit A1", gst, "paid", "2026-06-01", "2026-06-01T12:00:00.000Z", "led_jun_rent")
  ledger.run("led_jun_pay", "t_bbm", "u_waterman_a1", "u_devon", "payment", "eNACH demo ····4821", rent + gst, "paid", "2026-06-01", "2026-06-01T12:05:00.000Z", "led_jun_rent")
  ledger.run("led_sep_rent", "t_bbm", "u_waterman_a1", "u_devon", "rent", "September rent · Unit A1", rent, "due", "2026-09-01", "2026-09-01T12:00:00.000Z", null)
  ledger.run("led_sep_gst", "t_bbm", "u_waterman_a1", "u_devon", "gst", "GST (18%) · September rent · Unit A1", gst, "due", "2026-09-01", "2026-09-01T12:00:00.000Z", "led_sep_rent")
  ledger.run("led_sep_fee", "t_bbm", "u_waterman_a1", "u_devon", "late_fee", "Late fee · September rent past 5-day grace", fee, "due", "2026-09-06", "2026-09-06T12:00:00.000Z", "led_sep_rent")
  ledger.run("led_oct_rent", "t_bbm", "u_waterman_a1", "u_devon", "rent", "October rent · Unit A1", rent, "due", "2026-10-01", "2026-09-20T12:00:00.000Z", null)
  ledger.run("led_oct_gst", "t_bbm", "u_waterman_a1", "u_devon", "gst", "GST (18%) · October rent · Unit A1", gst, "due", "2026-10-01", "2026-09-20T12:00:00.000Z", "led_oct_rent")

  const t2 = db.prepare("SELECT sqft, rate_psf FROM units WHERE id = ?").get("u_thane_t2") as {
    sqft: number
    rate_psf: number
  }
  const nriRent = monthlyRentCents(t2.rate_psf, t2.sqft)
  const nriGst = gstCents(nriRent)
  ledger.run("led_nri_sep_rent", "t_nri", "u_thane_t2", "u_devon", "rent", "September rent · Unit T2", nriRent, "due", "2026-09-01", "2026-09-01T12:00:00.000Z", null)
  ledger.run("led_nri_sep_gst", "t_nri", "u_thane_t2", "u_devon", "gst", "GST (18%) · September rent · Unit T2", nriGst, "due", "2026-09-01", "2026-09-01T12:00:00.000Z", "led_nri_sep_rent")

  const job = db.prepare(
    `INSERT INTO jobs (id, tenant_id, property_id, unit_id, title, details, trade, status, provider_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  job.run("j_seal", "t_bbm", "p_waterman", "u_waterman_b1", "Weather seal on the north drive-in", "The north drive-in seal is torn. Trailer doors are catching in the monsoon.", "electrician", "assigned", "u_luis", "2026-09-20T16:00:00.000Z")
  job.run("j_dock", "t_bbm", "p_waterman", "u_waterman_a2", "Dock leveler sticks at the top of travel", "Bay 3 leveler pauses six inches short. Treat it as a make-ready before handover.", "electrician", "open", null, "2026-09-22T15:00:00.000Z")
  job.run("j_panel", "t_bbm", "p_bartley", "u_bartley_04", "Panel schedule labels missing in unit 04", "The 415V panel is live and labeled only at the main. Print a directory before showings.", "electrician", "open", null, "2026-09-23T15:00:00.000Z")
  job.run("j_sweep", "t_bbm", "p_cranfield", "u_cranfield_u1", "Pre-showing sweep of unit U1", "Dust and pallet scraps along the south wall before Thursday's tour.", "cleaning", "complete", "u_rosa", "2026-09-10T15:00:00.000Z")
  job.run("j_sump", "t_harbour", "p_commissioners", "u_commissioners_h1", "Sump alarm chirping in H1", "The pit alarm cycles every few minutes. No standing water this morning.", "plumber", "open", null, "2026-09-21T15:00:00.000Z")

  const note = db.prepare(
    `INSERT INTO notifications (id, user_id, title, body, href, read_at, created_at, channel)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
  )
  note.run("n1", "u_maya", "Application received", "Apex Logistics India is in review for Unit B2 at BBM Bhiwandi Hub.", "/account", "2026-09-18T14:31:00.000Z", "in_app")
  note.run("n1e", "u_maya", "Application received", "Apex Logistics India is in review for Unit B2 at BBM Bhiwandi Hub.", "/account", "2026-09-18T14:31:00.000Z", "email_demo")
  note.run("n1w", "u_maya", "Application received", "Apex Logistics India is in review for Unit B2 at BBM Bhiwandi Hub.", "/account", "2026-09-18T14:31:00.000Z", "whatsapp_demo")
  note.run("n2", "u_nadia", "New application", "Maya Chen at Apex Logistics India applied for Unit B2.", "/landlord/applications", "2026-09-18T14:31:00.000Z", "in_app")
  note.run("n3", "u_devon", "September rent is past grace", "A late fee was assessed on Unit A1. October rent is still inside grace. Amounts are in INR.", "/account/payments", "2026-09-06T12:10:00.000Z", "in_app")
  note.run("n3p", "u_devon", "September rent is past grace", "A late fee was assessed on Unit A1.", "/account/payments", "2026-09-06T12:10:00.000Z", "push_demo")
  note.run("n3w", "u_devon", "September rent is past grace", "A late fee was assessed on Unit A1. Pay via UPI or eNACH (demo).", "/account/payments", "2026-09-06T12:10:00.000Z", "whatsapp_demo")
  note.run("n4", "u_luis", "Job assigned", "Weather seal on the north drive-in at BBM Bhiwandi Hub is waiting for you to accept.", "/provider", "2026-09-20T16:05:00.000Z", "in_app")
  note.run("n5", "u_jonah", "Open concierge job", "Sump alarm in H1 has no provider yet. Amrita Singh is approved for Sriperumbudur.", "/landlord/jobs", "2026-09-21T15:05:00.000Z", "in_app")
  note.run("n6", "u_meera", "NRI display currency", "Your landlord desk shows USD as a view. Charges and the ledger stay in INR.", "/landlord/settings", "2026-09-15T10:00:00.000Z", "in_app")

  // Languages: English is the source. No parked markets and no extra locales are seeded.
  db.prepare(
    `INSERT INTO languages (code, name, status, waiting_reason, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?)`,
  ).run("en", "English", "ready", "2026-09-01T00:00:00.000Z", "2026-09-01T00:00:00.000Z")
}

function openDatabase() {
  const file = dbPath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
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

export function listSessionUsers() {
  return asRows(
    getDb()
      .prepare(
        `${USER_SQL}
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

function unitsFor(propertyId: string) {
  return asRows(
    getDb()
      .prepare("SELECT * FROM units WHERE property_id = ? ORDER BY code")
      .all(propertyId),
  ).map(mapUnit)
}

function mapProperty(row: Record<string, unknown>): PropertyRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name),
    name: String(row.name),
    slug: String(row.slug),
    address: String(row.address),
    area: String(row.area),
    cityLine: String(row.city_line),
    totalSqft: Number(row.total_sqft),
    floorPlanPath: str(row, "floor_plan_path"),
    latitude: num(row, "latitude"),
    longitude: num(row, "longitude"),
    units: unitsFor(String(row.id)),
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
  const units = asRows(db.prepare("SELECT status, sqft, rate_psf FROM units WHERE tenant_id = ?").all(tenantId))
  const leased = units.filter((unit) => unit.status === "leased")
  const occupancy = units.length === 0 ? 0 : Math.round((leased.length / units.length) * 100)
  const rentRoll = leased.reduce(
    (sum, unit) => sum + monthlyRentCents(Number(unit.rate_psf), Number(unit.sqft)),
    0,
  )
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
  kind: "rent" | "late_fee" | "payment" | "gst"
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
  if (!unitRow) return { ok: false as const, error: "That bay is not listed." }
  const unit = mapUnit(unitRow)
  if (unit.status === "leased") {
    return { ok: false as const, error: "This bay is leased. Choose an available one." }
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
      const unit = asRow(tx.prepare("SELECT sqft, rate_psf, code FROM units WHERE id = ?").get(application.unitId))
      const dueOn = firstOfNextMonth()
      const amount = monthlyRentCents(Number(unit?.rate_psf), Number(unit?.sqft))
      const gst = gstCents(amount)
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
  statuses?: UnitStatus[]
  minSqft?: number
  maxSqft?: number
  minRate?: number
  maxRate?: number
  minDocks?: number
  minDriveIns?: number
  minClearHeight?: number
  power?: string
  hasFloorPlan?: boolean
  hasMatterport?: boolean
  hasPano?: boolean
  sort?: "rate_asc" | "rate_desc" | "sqft_asc" | "sqft_desc" | "name"
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
  monthlyCents: number
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
           u.power, u.rate_psf, u.description, u.matterport_url,
           p.id AS property_id, p.name AS property_name, p.slug AS property_slug,
           p.address, p.area, p.city_line, p.floor_plan_path, p.latitude, p.longitude,
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
    const clearHeight = String(row.clear_height)
    const feet = Number((clearHeight.match(/(\d+(?:\.\d+)?)/) ?? [0, "0"])[1])
    const ratePsf = Number(row.rate_psf)
    const sqftVal = Number(row.sqft)
    return {
      unitId: String(row.unit_id),
      code: String(row.code),
      status: String(row.status) as UnitStatus,
      sqft: sqftVal,
      clearHeight,
      clearHeightFeet: feet,
      docks: Number(row.docks),
      driveIns: Number(row.drive_ins),
      power: String(row.power),
      ratePsf,
      monthlyCents: monthlyRentCents(ratePsf, sqftVal),
      description: String(row.description),
      matterportUrl: str(row, "matterport_url"),
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
    if (filters.tenantId && card.tenantId !== filters.tenantId) return false
    if (filters.area && card.area !== filters.area) return false
    if (filters.minSqft != null && card.sqft < filters.minSqft) return false
    if (filters.maxSqft != null && card.sqft > filters.maxSqft) return false
    if (filters.minRate != null && card.ratePsf < filters.minRate) return false
    if (filters.maxRate != null && card.ratePsf > filters.maxRate) return false
    if (filters.minDocks != null && card.docks < filters.minDocks) return false
    if (filters.minDriveIns != null && card.driveIns < filters.minDriveIns) return false
    if (filters.minClearHeight != null && card.clearHeightFeet < filters.minClearHeight) return false
    if (filters.power) {
      const needle = filters.power.trim().toLowerCase()
      if (needle && !card.power.toLowerCase().includes(needle)) return false
    }
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
    "INSERT INTO tenants (id, name, slug, city, kind) VALUES (?, ?, ?, ?, 'landlord')",
  ).run(tenantId, input.companyName, slug, input.city)
  db.prepare(
    `INSERT INTO users (id, name, email, role, tenant_id, company, trade, service_area, provider_verified)
     VALUES (?, ?, ?, 'landlord_admin', ?, NULL, NULL, NULL, 0)`,
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


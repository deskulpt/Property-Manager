/**
 * Single labelled demo portfolio for local/e2e. Real landlord signups use is_demo=0
 * and never appear in the demo identity switcher.
 */
import {
  lateFeeCents,
  monthlyRentCents,
  type UnitStatus,
} from "@/lib/format"
import { gstCents } from "@/lib/market"
import {
  stringifyAttributes,
  warehouseAttributesFromColumns,
} from "@/lib/listing-schemas"

/** Minimal surface used by the seed; accepts node:sqlite DatabaseSync. */
type Sql = {
  prepare: (sql: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run: (...params: any[]) => unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: (...params: any[]) => unknown
  }
}

export function seedDemoDatabase(db: Sql) {
  const tenant = db.prepare(
    "INSERT INTO tenants (id, name, slug, city, kind, display_currency, package, is_demo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  )
  tenant.run("t_deskulpt", "DeSkulpt India Pvt Ltd", "deskulpt", "Hyderabad", "platform", "INR", "pro", 1)
  tenant.run(
    "t_bbm",
    "DEMO · EasyRent Hyderabad",
    "easyrent-demo-hyd",
    "Hyderabad",
    "landlord",
    "INR",
    "pro",
    1,
  )

  const user = db.prepare(
    `INSERT INTO users (id, name, email, role, tenant_id, company, trade, service_area, provider_verified, phone, password_hash, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
  )
  user.run("u_avery", "Avery Quinn", "avery@deskulpt.example", "super_admin", "t_deskulpt", "DeSkulpt India Pvt Ltd", null, null, 0, "+918012345678")
  user.run("u_chris", "Chris Vogel", "chris@deskulpt.example", "property_manager", "t_deskulpt", "DeSkulpt India Pvt Ltd", null, null, 0, "+918022334455")
  user.run("u_jordan", "Jordan Blake", "jordan@deskulpt.example", "merchandiser", "t_deskulpt", "DeSkulpt India Pvt Ltd", null, null, 0, "+919900112233")
  user.run("u_maya", "Maya Chen", "maya@apexlogistics.example", "applicant", null, "Apex Logistics India", null, null, 0, "+919876543210")
  user.run("u_devon", "Devon Hale", "devon@northline.example", "applicant", null, "Northline Distribution India", null, null, 0, "+919811223344")
  user.run("u_ravi", "Ravi Menon", "ravi@menon.example", "applicant", null, null, null, null, 0, "+919900778899")
  user.run("u_nadia", "Nadia Okonkwo", "nadia@demo.easyrent.example", "landlord_admin", "t_bbm", null, null, null, 0, "+914040012345")
  user.run("u_luis", "Luis Ortega", "luis@ortegaelectric.example", "service_provider", null, null, "electrician", "Bhiwandi", 1, "+919820011122")

  db.prepare("INSERT INTO provider_approvals (tenant_id, user_id, status) VALUES (?, ?, ?)").run(
    "t_bbm",
    "u_luis",
    "approved",
  )

  const property = db.prepare(
    `INSERT INTO properties (
      id, tenant_id, name, slug, address, area, city_line, total_sqft, segment, subtype,
      floor_plan_path, model_path, latitude, longitude
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  property.run(
    "p_waterman",
    "t_bbm",
    "Demo Bhiwandi Hub",
    "waterman",
    "Plot 19, Kalyan-Bhiwandi Road, Bhiwandi, Maharashtra 421302",
    "Bhiwandi",
    "DEMO · BHIWANDI · PIN 421302",
    134600,
    "warehouse",
    "logistics_park",
    "/floorplans/waterman.svg",
    null,
    19.2813,
    73.0483,
  )
  property.run(
    "p_forum",
    "t_bbm",
    "Demo Forum Mall Storefronts",
    "forum-hyd",
    "Forum Sujana Mall, Kukatpally, Hyderabad, Telangana 500072",
    "Kukatpally",
    "DEMO · HYDERABAD · KUKATPALLY",
    18000,
    "commercial",
    "mall_store",
    null,
    null,
    17.4942,
    78.3996,
  )
  property.run(
    "p_jubilee",
    "t_bbm",
    "Demo Jubilee Hills Residences",
    "jubilee-hyd",
    "Road No. 36, Jubilee Hills, Hyderabad, Telangana 500033",
    "Jubilee Hills",
    "DEMO · HYDERABAD · JUBILEE HILLS",
    4200,
    "residential",
    "apartment",
    null,
    null,
    17.4326,
    78.4071,
  )

  const unitStmt = db.prepare(
    `INSERT INTO units (
      id, tenant_id, property_id, floor_id, code, sqft, clear_height, docks, drive_ins, power,
      rate_psf, rate_basis, rent_amount_minor, attributes, bhk, carpet_sqft,
      security_deposit_months, maintenance_minor, gst_applicable,
      status, hotspot_x, hotspot_y, matterport_url, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  const MATTERPORTS: Record<string, string> = {
    "waterman:B1": "https://my.matterport.com/show/?m=PmWtWjyqpJs",
    "waterman:A2": "https://my.matterport.com/show/?m=VpGQDT9DFjr",
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

  function addWarehouse(units: UnitSeed[]) {
    for (const unit of units) {
      const key = `waterman:${unit.code}`
      const walk = MATTERPORTS[key] ?? null
      const rich = key === "waterman:B1"
      const attrs = stringifyAttributes(
        warehouseAttributesFromColumns({
          clearHeight: unit.h,
          docks: unit.dock,
          driveIns: unit.drive,
          power: unit.pwr,
        }),
      )
      unitStmt.run(
        `u_waterman_${unit.code.toLowerCase()}`,
        "t_bbm",
        "p_waterman",
        null,
        unit.code,
        unit.sqft,
        unit.h,
        unit.dock,
        unit.drive,
        unit.pwr,
        unit.rate,
        "per_sqft_month",
        null,
        attrs,
        null,
        null,
        null,
        null,
        1,
        unit.status,
        unit.x,
        unit.y,
        walk,
        rich
          ? "Flagship demo bay. Clear-span distribution with stills, motion, 360, and Matterport."
          : `${unit.sqft.toLocaleString("en-IN")} SF demo bay. ${unit.h} clear, ${unit.dock} docks.`,
      )
    }
  }

  addWarehouse([
    { code: "A1", sqft: 38500, h: "28'", dock: 6, drive: 1, pwr: "600A / 415V", rate: 52, status: "leased", x: 22, y: 38 },
    { code: "A2", sqft: 24200, h: "26'", dock: 4, drive: 1, pwr: "400A / 415V", rate: 55, status: "available", x: 46, y: 38 },
    { code: "B1", sqft: 52000, h: "30'", dock: 8, drive: 2, pwr: "800A / 415V", rate: 48, status: "available", x: 22, y: 68 },
    { code: "B2", sqft: 18900, h: "24'", dock: 3, drive: 1, pwr: "400A / 415V", rate: 58, status: "pending", x: 46, y: 68 },
  ])

  unitStmt.run(
    "u_forum_s12",
    "t_bbm",
    "p_forum",
    null,
    "S12",
    1650,
    "",
    0,
    0,
    "",
    0,
    "flat_month",
    27500000,
    stringifyAttributes({
      carpetSqft: 1200,
      superBuiltUpSqft: 1650,
      frontageFt: 28,
      floor: "L1",
      mallName: "Forum Sujana Mall",
      footfallBand: "High weekend",
      camChargesMinor: 4500000,
      fitOut: "warm_shell",
    }),
    null,
    1200,
    6,
    4500000,
    1,
    "available",
    null,
    null,
    null,
    "Demo mall storefront. Carpet 1,200 SF · SBU 1,650 SF.",
  )

  unitStmt.run(
    "u_jubilee_3b",
    "t_bbm",
    "p_jubilee",
    null,
    "3B",
    1850,
    "",
    0,
    0,
    "",
    0,
    "flat_month",
    8500000,
    stringifyAttributes({
      bhk: 3,
      furnishing: "semi",
      bathrooms: 3,
      societyAmenities: ["Clubhouse", "24×7 security", "Covered parking"],
      parking: "1 covered",
      petPolicy: "Pets welcome with deposit",
      preferredTenants: "Family / NRI owner-managed",
    }),
    3,
    1650,
    3,
    800000,
    0,
    "available",
    null,
    null,
    null,
    "Demo 3 BHK. 11-month agreement. Residential rent — GST not charged in this demo.",
  )

  const media = db.prepare(
    `INSERT INTO unit_media (id, tenant_id, unit_id, kind, url, caption, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  const b1 = "u_waterman_b1"
  media.run("m1", "t_bbm", b1, "photo", "/media/b1-dock.jpg", "Dock approach", 1)
  media.run("m2", "t_bbm", b1, "photo", "/media/b1-aisle.jpg", "Rack aisle", 2)
  media.run("m3", "t_bbm", b1, "photo", "/media/b1-yard.jpg", "Yard and trailer positions", 3)
  media.run("m4", "t_bbm", b1, "gif", "/media/b1-loop.gif", "Motion loop", 5)
  media.run("m5", "t_bbm", b1, "video", "/media/b1-walk.mp4", "Walk-through clip", 6)
  media.run("m6", "t_bbm", b1, "pano", "/media/b1-pano.jpg", "360 photo", 7)

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
    "Regional distribution and cross-dock",
    "Demo occupant with ledger history.",
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
    "Last-mile parcel sortation",
    "Demo application awaiting landlord approval.",
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
    "kyc_provider",
    "IDFY-DEMO-DEVON",
    "provider-hosted",
    0.94,
    "match",
    "2026-03-02T18:00:00.000Z",
  )

  db.prepare(
    "INSERT INTO late_fee_rules (tenant_id, grace_days, flat_cents, percent_bps) VALUES (?, ?, ?, ?)",
  ).run("t_bbm", 5, 2500000, 150)

  db.prepare(
    `INSERT INTO payment_methods (id, user_id, tenant_id, brand, last4, autopay, provider_ref)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run("pm_devon", "u_devon", "t_bbm", "eNACH / auto-debit (demo)", "4821", 1, "demo_enach_4821_t_bbm")

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

  db.prepare(
    `INSERT INTO jobs (id, tenant_id, property_id, unit_id, title, details, trade, status, provider_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "j_seal",
    "t_bbm",
    "p_waterman",
    "u_waterman_b1",
    "Weather seal on the north drive-in",
    "Demo concierge job for the provider portal.",
    "electrician",
    "assigned",
    "u_luis",
    "2026-09-20T16:00:00.000Z",
  )

  const note = db.prepare(
    `INSERT INTO notifications (id, user_id, title, body, href, read_at, created_at, channel)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
  )
  note.run("n1", "u_maya", "Application received", "Apex Logistics India is in review for Unit B2 (demo).", "/account", "2026-09-18T14:31:00.000Z", "in_app")
  note.run("n2", "u_nadia", "New application", "Maya Chen applied for Unit B2 (demo).", "/landlord/applications", "2026-09-18T14:31:00.000Z", "in_app")
  note.run("n3", "u_devon", "September rent is past grace", "A late fee was assessed on Unit A1. Demo INR ledger.", "/account/payments", "2026-09-06T12:10:00.000Z", "in_app")
  note.run("n4", "u_luis", "Job assigned", "Weather seal job waiting at Demo Bhiwandi Hub.", "/provider", "2026-09-20T16:05:00.000Z", "in_app")

  db.prepare(
    `INSERT INTO shop_settings (tenant_id, enabled, demo_mode, razorpay_key_id, razorpay_key_secret_enc, razorpay_mode)
     VALUES (?, 1, 1, NULL, NULL, 'test')`,
  ).run("t_bbm")

  const sku = db.prepare(
    `INSERT INTO shop_skus (
      id, tenant_id, property_id, name, kind, price_cents, enabled, stock, slot_capacity, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
  )
  sku.run("sku_bbm_keys", "t_bbm", "p_waterman", "Extra Keys", "purchase", 50000, 50, null, 1)
  sku.run("sku_bbm_fob", "t_bbm", "p_waterman", "FOB", "purchase", 150000, 40, null, 2)
  sku.run("sku_bbm_filters", "t_bbm", "p_waterman", "Air Filters", "purchase", 80000, 100, null, 3)
  sku.run("sku_bbm_toolkit", "t_bbm", "p_waterman", "Repair tool kit rental", "rental", 20000, null, 1, 4)
  sku.run("sku_bbm_lift", "t_bbm", "p_waterman", "Service Lift Booking", "rental", 100000, null, 1, 5)

  db.prepare(
    `INSERT INTO languages (code, name, status, waiting_reason, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?)`,
  ).run("en", "English", "ready", "2026-09-01T00:00:00.000Z", "2026-09-01T00:00:00.000Z")
}

import "server-only"
import { getDb } from "@/lib/db"
import { extractPin, anyAreaCoversProperty } from "@/lib/partners/geo"
import {
  PARTNER_STATUS_NEXT,
  type IdCheckResult,
  type PartnerApplication,
  type PartnerReferral,
  type PartnerReferralStatus,
  type PartnerServiceArea,
  type PartnerStatus,
  type PartnerSubtype,
  type PartnerTrack,
  type PropertyGeo,
  type ServiceSubtype,
} from "@/lib/partners/types"
import type { Trade } from "@/lib/format"

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
  return value == null || value === "" ? null : Number(value)
}

function mapArea(row: Record<string, unknown>): PartnerServiceArea {
  return {
    id: String(row.id),
    applicationId: String(row.application_id),
    citySlug: str(row, "city_slug"),
    pinPrefix: str(row, "pin_prefix"),
    radiusKm: num(row, "radius_km"),
    homeLat: num(row, "home_lat"),
    homeLng: num(row, "home_lng"),
    active: Number(row.active) === 1,
  }
}

function areasFor(applicationId: string): PartnerServiceArea[] {
  return asRows(
    getDb()
      .prepare(
        `SELECT * FROM partner_service_areas WHERE application_id = ? ORDER BY city_slug, pin_prefix`,
      )
      .all(applicationId),
  ).map(mapArea)
}

function mapApplication(row: Record<string, unknown>): PartnerApplication {
  const id = String(row.id)
  return {
    id,
    track: String(row.track) as PartnerTrack,
    subtype: String(row.subtype) as PartnerSubtype,
    status: String(row.status) as PartnerStatus,
    name: String(row.name),
    phone: String(row.phone),
    email: String(row.email),
    pan: str(row, "pan"),
    aadhaarLast4: str(row, "aadhaar_last4"),
    aadhaarConsentAt: str(row, "aadhaar_consent_at"),
    gstin: str(row, "gstin"),
    licenceRef: str(row, "licence_ref"),
    docsJson: String(row.docs_json ?? "[]"),
    notesStaff: String(row.notes_staff ?? ""),
    idCheckResult: String(row.id_check_result) as IdCheckResult,
    demandOk: Number(row.demand_ok) === 1,
    userId: str(row, "user_id"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    areas: areasFor(id),
  }
}

function mapReferral(row: Record<string, unknown>): PartnerReferral {
  return {
    id: String(row.id),
    referrerName: String(row.referrer_name),
    referrerPhone: String(row.referrer_phone),
    referrerEmail: String(row.referrer_email),
    referredName: String(row.referred_name),
    referredPhone: String(row.referred_phone),
    referredEmail: String(row.referred_email),
    track: String(row.track) as PartnerTrack,
    subtype: String(row.subtype) as PartnerSubtype,
    city: String(row.city),
    pin: String(row.pin),
    status: String(row.status) as PartnerReferralStatus,
    convertedApplicationId: str(row, "converted_application_id"),
    consentAt: String(row.consent_at),
    createdAt: String(row.created_at),
  }
}

export function listPartnerApplications(filters?: {
  track?: PartnerTrack
  status?: PartnerStatus
}): PartnerApplication[] {
  const clauses: string[] = []
  const params: string[] = []
  if (filters?.track) {
    clauses.push("track = ?")
    params.push(filters.track)
  }
  if (filters?.status) {
    clauses.push("status = ?")
    params.push(filters.status)
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""
  return asRows(
    getDb()
      .prepare(
        `SELECT * FROM partner_applications ${where} ORDER BY updated_at DESC, created_at DESC`,
      )
      .all(...params),
  ).map(mapApplication)
}

export function getPartnerApplication(id: string): PartnerApplication | null {
  const row = asRow(
    getDb().prepare("SELECT * FROM partner_applications WHERE id = ?").get(id),
  )
  return row ? mapApplication(row) : null
}

export function getPartnerApplicationForEmail(email: string): PartnerApplication | null {
  const row = asRow(
    getDb()
      .prepare(
        "SELECT * FROM partner_applications WHERE lower(email) = lower(?) ORDER BY created_at DESC LIMIT 1",
      )
      .get(email),
  )
  return row ? mapApplication(row) : null
}

export function listPartnerReferrals(): PartnerReferral[] {
  return asRows(
    getDb()
      .prepare("SELECT * FROM partner_referrals ORDER BY created_at DESC")
      .all(),
  ).map(mapReferral)
}

export type AreaInput = {
  citySlug?: string | null
  pinPrefix?: string | null
  radiusKm?: number | null
  homeLat?: number | null
  homeLng?: number | null
  active?: boolean
}

export function createPartnerApplication(input: {
  track: PartnerTrack
  subtype: PartnerSubtype
  name: string
  phone: string
  email: string
  pan?: string | null
  aadhaarLast4?: string | null
  aadhaarConsent: boolean
  gstin?: string | null
  licenceRef?: string | null
  docsStub?: string | null
  areas: AreaInput[]
}): { ok: true; id: string } | { ok: false; error: string } {
  const now = new Date().toISOString()
  const id = `pa_${crypto.randomUUID().slice(0, 8)}`
  const docs = JSON.stringify(
    input.docsStub ? [{ name: input.docsStub, kind: "upload_stub" }] : [],
  )
  getDb()
    .prepare(
      `INSERT INTO partner_applications (
        id, track, subtype, status, name, phone, email,
        pan, aadhaar_last4, aadhaar_consent_at, gstin, licence_ref,
        docs_json, notes_staff, id_check_result, demand_ok, user_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'applied', ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'pending', 0, NULL, ?, ?)`,
    )
    .run(
      id,
      input.track,
      input.subtype,
      input.name,
      input.phone,
      input.email,
      input.pan ?? null,
      input.aadhaarLast4 ?? null,
      input.aadhaarConsent ? now : null,
      input.gstin ?? null,
      input.licenceRef ?? null,
      docs,
      now,
      now,
    )
  for (const area of input.areas) {
    insertArea(id, area)
  }
  return { ok: true, id }
}

function insertArea(applicationId: string, area: AreaInput) {
  getDb()
    .prepare(
      `INSERT INTO partner_service_areas (
        id, application_id, city_slug, pin_prefix, radius_km, home_lat, home_lng, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      `psa_${crypto.randomUUID().slice(0, 8)}`,
      applicationId,
      area.citySlug ?? null,
      area.pinPrefix ?? null,
      area.radiusKm ?? null,
      area.homeLat ?? null,
      area.homeLng ?? null,
      area.active === false ? 0 : 1,
    )
}

export function createPartnerReferral(input: {
  referrerName: string
  referrerPhone: string
  referrerEmail: string
  referredName: string
  referredPhone: string
  referredEmail: string
  track: PartnerTrack
  subtype: PartnerSubtype
  city: string
  pin: string
}): { ok: true; id: string } | { ok: false; error: string } {
  if (input.referrerPhone.replace(/\D/g, "") === input.referredPhone.replace(/\D/g, "")) {
    return { ok: false, error: "Self-referral is not allowed (same phone)." }
  }
  const now = new Date().toISOString()
  const id = `pr_${crypto.randomUUID().slice(0, 8)}`
  getDb()
    .prepare(
      `INSERT INTO partner_referrals (
        id, referrer_name, referrer_phone, referrer_email,
        referred_name, referred_phone, referred_email,
        track, subtype, city, pin, status, converted_application_id, consent_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NULL, ?, ?)`,
    )
    .run(
      id,
      input.referrerName,
      input.referrerPhone,
      input.referrerEmail,
      input.referredName,
      input.referredPhone,
      input.referredEmail,
      input.track,
      input.subtype,
      input.city,
      input.pin,
      now,
      now,
    )
  return { ok: true, id }
}

function ensureProviderUser(app: PartnerApplication): string {
  if (app.userId) return app.userId
  const existing = asRow(
    getDb()
      .prepare("SELECT id FROM users WHERE lower(email) = lower(?)")
      .get(app.email),
  )
  if (existing) {
    const uid = String(existing.id)
    getDb()
      .prepare(
        `UPDATE users SET role = 'service_provider', trade = ?, service_area = ?,
         provider_verified = 1, phone = ?, company = COALESCE(company, ?) WHERE id = ?`,
      )
      .run(
        app.track === "service" ? app.subtype : null,
        app.areas[0]?.citySlug ?? "India",
        app.phone,
        app.name,
        uid,
      )
    getDb()
      .prepare("UPDATE partner_applications SET user_id = ?, updated_at = ? WHERE id = ?")
      .run(uid, new Date().toISOString(), app.id)
    return uid
  }
  const uid = `u_pa_${app.id.slice(3)}`
  const homeCity = app.areas[0]?.citySlug ?? "India"
  getDb()
    .prepare(
      `INSERT INTO users (
        id, name, email, role, tenant_id, company, trade, service_area, provider_verified, phone, password_hash
      ) VALUES (?, ?, ?, 'service_provider', NULL, ?, ?, ?, 1, ?, NULL)`,
    )
    .run(
      uid,
      app.name,
      app.email,
      app.name,
      app.track === "service" ? app.subtype : null,
      homeCity,
      app.phone,
    )
  getDb()
    .prepare("UPDATE partner_applications SET user_id = ?, updated_at = ? WHERE id = ?")
    .run(uid, new Date().toISOString(), app.id)
  return uid
}

export function advancePartnerStatus(
  id: string,
  to?: PartnerStatus,
): { ok: true; status: PartnerStatus } | { ok: false; error: string } {
  const app = getPartnerApplication(id)
  if (!app) return { ok: false, error: "Application not found." }
  if (app.status === "rejected") {
    return { ok: false, error: "Rejected applications are terminal." }
  }
  const next = to ?? PARTNER_STATUS_NEXT[app.status]
  if (!next) return { ok: false, error: `No default advance from ${app.status}.` }
  const now = new Date().toISOString()
  getDb()
    .prepare("UPDATE partner_applications SET status = ?, updated_at = ? WHERE id = ?")
    .run(next, now, id)
  if (next === "active" && app.track === "service") {
    ensureProviderUser({ ...app, status: next })
  }
  return { ok: true, status: next }
}

export function setPartnerIdCheck(
  id: string,
  result: IdCheckResult,
): { ok: true } | { ok: false; error: string } {
  const app = getPartnerApplication(id)
  if (!app) return { ok: false, error: "Application not found." }
  getDb()
    .prepare(
      "UPDATE partner_applications SET id_check_result = ?, updated_at = ? WHERE id = ?",
    )
    .run(result, new Date().toISOString(), id)
  return { ok: true }
}

export function setPartnerDemandOk(
  id: string,
  demandOk: boolean,
): { ok: true } | { ok: false; error: string } {
  const app = getPartnerApplication(id)
  if (!app) return { ok: false, error: "Application not found." }
  getDb()
    .prepare("UPDATE partner_applications SET demand_ok = ?, updated_at = ? WHERE id = ?")
    .run(demandOk ? 1 : 0, new Date().toISOString(), id)
  return { ok: true }
}

export function setPartnerNotes(
  id: string,
  notes: string,
): { ok: true } | { ok: false; error: string } {
  const app = getPartnerApplication(id)
  if (!app) return { ok: false, error: "Application not found." }
  getDb()
    .prepare("UPDATE partner_applications SET notes_staff = ?, updated_at = ? WHERE id = ?")
    .run(notes, new Date().toISOString(), id)
  return { ok: true }
}

export function replacePartnerAreas(
  id: string,
  areas: AreaInput[],
): { ok: true } | { ok: false; error: string } {
  const app = getPartnerApplication(id)
  if (!app) return { ok: false, error: "Application not found." }
  getDb().prepare("DELETE FROM partner_service_areas WHERE application_id = ?").run(id)
  for (const area of areas) insertArea(id, area)
  getDb()
    .prepare("UPDATE partner_applications SET updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id)
  return { ok: true }
}

export function setReferralStatus(
  id: string,
  status: PartnerReferralStatus,
): { ok: true } | { ok: false; error: string } {
  const row = asRow(
    getDb().prepare("SELECT id FROM partner_referrals WHERE id = ?").get(id),
  )
  if (!row) return { ok: false, error: "Referral not found." }
  getDb().prepare("UPDATE partner_referrals SET status = ? WHERE id = ?").run(status, id)
  return { ok: true }
}

export function propertyGeo(propertyId: string): PropertyGeo | null {
  const row = asRow(
    getDb()
      .prepare(
        `SELECT id, name, area, pin_code, latitude, longitude, address, city_line
         FROM properties WHERE id = ?`,
      )
      .get(propertyId),
  )
  if (!row) return null
  const pin =
    str(row, "pin_code") ||
    extractPin(str(row, "address")) ||
    extractPin(str(row, "city_line"))
  return {
    id: String(row.id),
    name: String(row.name),
    area: String(row.area),
    pinCode: pin,
    latitude: num(row, "latitude"),
    longitude: num(row, "longitude"),
  }
}

export type MatchedServiceProvider = {
  applicationId: string
  userId: string
  name: string
  email: string
  trade: ServiceSubtype
  catchments: string
}

/**
 * Active service providers whose catchment covers the property.
 * Hidden when suspended/rejected, demand_ok=false, or areas miss.
 */
export function matchActiveServiceProviders(
  propertyId: string,
  trade: Trade | ServiceSubtype,
): MatchedServiceProvider[] {
  const property = propertyGeo(propertyId)
  if (!property) return []
  const apps = listPartnerApplications({ track: "service" }).filter(
    (app) =>
      app.status === "active" &&
      app.demandOk &&
      app.subtype === trade &&
      anyAreaCoversProperty(app.areas, property),
  )
  return apps
    .map((app) => {
      const userId = app.userId ?? ensureProviderUser(app)
      return {
        applicationId: app.id,
        userId,
        name: app.name,
        email: app.email,
        trade: app.subtype as ServiceSubtype,
        catchments: app.areas
          .filter((a) => a.active)
          .map(
            (a) =>
              [a.citySlug, a.pinPrefix ? `PIN ${a.pinPrefix}*` : null, a.radiusKm != null ? `${a.radiusKm}km` : null]
                .filter(Boolean)
                .join(" · ") || "area",
          )
          .join("; "),
      }
    })
    .filter((item) => Boolean(item.userId))
}

export function partnerNetworkEnabled() {
  return process.env.PARTNER_NETWORK !== "0"
}

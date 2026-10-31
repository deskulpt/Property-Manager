import "server-only"
import { getDb } from "@/lib/db"
import {
  isESignLive,
  readDigioCredentials,
  readEmudhraCredentials,
  readESignCallbackUrl,
  resolveESignProviderId,
} from "@/lib/agentic/esign"
import { resolveBillingProvider, resolvePrimaryProviderName } from "@/lib/billing"
import { resolveKycProvider } from "@/lib/kyc/providers"
import { resolveEmailOtpProvider, resolveSmsOtpProvider } from "@/lib/otp/providers"
import { ACTIVE_MARKET_ID, MARKETS, activeMarket } from "@/lib/market"
import { LIVE_MARKET } from "@/lib/market-checklist"
import type { PlanId } from "@/lib/plans"

/** Durable L0 ops toggles (meta table). Env secrets stay env-only. */
export const OPS_FLAG_DEFS = [
  {
    key: "partner_network",
    label: "Partner & service network",
    blurb: "Public partner apply + console vet queue. Off hides network CTAs.",
    defaultOn: true,
  },
  {
    key: "refer_earn",
    label: "Refer & Earn",
    blurb: "Indication submit + rewards pipeline on /refer.",
    defaultOn: true,
  },
  {
    key: "ask_easy",
    label: "Ask Easy (platform)",
    blurb: "Landlord Ask Easy desk + memory. Off shows upgrade/disabled CTA.",
    defaultOn: true,
  },
  {
    key: "listings_marketplace",
    label: "Public listings marketplace",
    blurb: "Public /listings catalogue. Off still keeps landlord CRUD.",
    defaultOn: true,
  },
  {
    key: "public_shop",
    label: "Occupant shop",
    blurb: "Property shop browse/checkout surfaces.",
    defaultOn: true,
  },
  {
    key: "otp_demo_preferred",
    label: "Prefer demo OTP",
    blurb: "Ops preference when OTP_LIVE≠1 — staff reminder only; live still needs keys.",
    defaultOn: true,
  },
  {
    key: "kyc_demo_preferred",
    label: "Prefer demo KYC",
    blurb: "Ops preference when licensed KYC keys missing.",
    defaultOn: true,
  },
  {
    key: "esign_demo_preferred",
    label: "Prefer demo eSign",
    blurb: "Ops preference when Digio/eMudhra dry-run not selected.",
    defaultOn: true,
  },
] as const

export type OpsFlagKey = (typeof OPS_FLAG_DEFS)[number]["key"]

const META_PREFIX = "ops.flag."

function asRow(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null
  return value as Record<string, unknown>
}

export function getMetaValue(key: string): string | null {
  const row = asRow(getDb().prepare("SELECT value FROM meta WHERE key = ?").get(key))
  return row?.value == null ? null : String(row.value)
}

export function setMetaValue(key: string, value: string) {
  getDb()
    .prepare(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value)
}

export function isOpsFlagOn(key: OpsFlagKey): boolean {
  const def = OPS_FLAG_DEFS.find((d) => d.key === key)
  const raw = getMetaValue(`${META_PREFIX}${key}`)
  if (raw == null) return def?.defaultOn ?? true
  return raw === "1" || raw === "true" || raw === "on"
}

export function setOpsFlag(key: OpsFlagKey, on: boolean) {
  if (!OPS_FLAG_DEFS.some((d) => d.key === key)) {
    return { ok: false as const, error: "Unknown flag." }
  }
  setMetaValue(`${META_PREFIX}${key}`, on ? "1" : "0")
  return { ok: true as const }
}

export function listOpsFlags() {
  return OPS_FLAG_DEFS.map((def) => ({
    ...def,
    on: isOpsFlagOn(def.key),
  }))
}

export type AdapterHealth = {
  id: string
  label: string
  mode: "live" | "dry_run" | "demo" | "missing_keys" | "off"
  detail: string
  envHints: string[]
}

export function otpAdapterStatus(): AdapterHealth[] {
  const sms = resolveSmsOtpProvider()
  const email = resolveEmailOtpProvider()
  const live = process.env.OTP_LIVE === "1"
  return [
    {
      id: "otp-sms",
      label: `SMS · ${sms.name}`,
      mode: live && sms.name !== "demo" ? "live" : sms.name === "demo" ? "demo" : "dry_run",
      detail: live
        ? "OTP_LIVE=1 — production path (codes never echoed)."
        : "Demo/dry-run — set OTP_LIVE=1 + provider keys for live SMS.",
      envHints: ["OTP_SMS_PROVIDER", "OTP_LIVE", "MSG91_AUTH_KEY", "TWILIO_ACCOUNT_SID"],
    },
    {
      id: "otp-email",
      label: `Email · ${email.name}`,
      mode: live && email.name !== "demo" ? "live" : "demo",
      detail: "Transactional email OTP adapter.",
      envHints: ["OTP_EMAIL_PROVIDER", "EMAIL_OTP_API_KEY", "RESEND_API_KEY"],
    },
  ]
}

export function kycAdapterStatus(): AdapterHealth[] {
  const provider = resolveKycProvider()
  const liveKeys =
    Boolean(process.env.IDFY_WEBHOOK_SECRET?.trim()) ||
    Boolean(process.env.SIGNZY_WEBHOOK_SECRET?.trim()) ||
    Boolean(process.env.HYPERVERGE_WEBHOOK_SECRET?.trim())
  return [
    {
      id: "kyc",
      label: `KYC · ${provider.name}`,
      mode: provider.name === "demo" ? "demo" : liveKeys ? "dry_run" : "missing_keys",
      detail:
        provider.name === "demo"
          ? "Demo redirect approve path. Switch KYC_PROVIDER + webhook secret for licensed vendor."
          : liveKeys
            ? "Vendor selected; stub redirect until live Siteverify is wired."
            : "Vendor selected but webhook secret missing.",
      envHints: ["KYC_PROVIDER", "IDFY_WEBHOOK_SECRET", "SIGNZY_WEBHOOK_SECRET", "HYPERVERGE_WEBHOOK_SECRET"],
    },
  ]
}

export function esignAdapterStatus(): AdapterHealth[] {
  const id = resolveESignProviderId()
  const live = isESignLive()
  const digio = readDigioCredentials()
  const emudhra = readEmudhraCredentials()
  const callback = readESignCallbackUrl()
  const rows: AdapterHealth[] = [
    {
      id: "esign-active",
      label: `Active · ${id}`,
      mode:
        id === "demo"
          ? "demo"
          : id === "docusign"
            ? "off"
            : id === "digio" && !digio
              ? "missing_keys"
              : id === "emudhra" && !emudhra
                ? "missing_keys"
                : live
                  ? "live"
                  : "dry_run",
      detail:
        id === "demo"
          ? "Local demo stamp. Set ESIGN_PROVIDER=digio|emudhra for India adapters."
          : id === "docusign"
            ? "DocuSign reserved for CA/US — not wired."
            : live
              ? "ESIGN_LIVE=1 — live HTTP still refused until transport lands."
              : "Dry-run shapes Digio/eMudhra payloads; no network.",
      envHints: ["ESIGN_PROVIDER", "ESIGN_LIVE", "ESIGN_CALLBACK_URL", "DIGIO_CLIENT_ID", "EMUDHRA_ASP_ID"],
    },
    {
      id: "esign-digio",
      label: "Digio",
      mode: digio ? (live ? "live" : "dry_run") : "missing_keys",
      detail: digio ? `Keys present · base ${digio.baseUrl}` : "DIGIO_CLIENT_ID / DIGIO_CLIENT_SECRET unset.",
      envHints: ["DIGIO_CLIENT_ID", "DIGIO_CLIENT_SECRET", "DIGIO_BASE_URL"],
    },
    {
      id: "esign-emudhra",
      label: "eMudhra",
      mode: emudhra ? (callback ? (live ? "live" : "dry_run") : "missing_keys") : "missing_keys",
      detail: emudhra
        ? callback
          ? `ASP keys present · base ${emudhra.baseUrl}`
          : "Keys present but ESIGN_CALLBACK_URL required."
        : "EMUDHRA_ASP_ID / EMUDHRA_API_KEY unset.",
      envHints: ["EMUDHRA_ASP_ID", "EMUDHRA_API_KEY", "ESIGN_CALLBACK_URL"],
    },
  ]
  return rows
}

export function billingAdapterStatus(): AdapterHealth[] {
  const primary = resolvePrimaryProviderName()
  const provider = resolveBillingProvider()
  return [
    {
      id: "billing",
      label: `Billing · ${provider.name} (primary ${primary})`,
      mode: provider.name === "demo" ? "demo" : "dry_run",
      detail: "IN → primary MoR; intl → BILLING_INTL_PROVIDER (paypal). Checkout writes billing_subscriptions.",
      envHints: ["BILLING_PROVIDER", "BILLING_INTL_PROVIDER", "DODO_API_KEY", "PAYPAL_CLIENT_ID"],
    },
  ]
}

export type PlatformSubscriptionRow = {
  id: string
  tenantId: string
  tenantName: string
  provider: string
  status: string
  cadence: string
  package: PlanId | string
  currentPeriodEnd: string | null
  updatedAt: string
}

export function listPlatformSubscriptions(): PlatformSubscriptionRow[] {
  return (
    getDb()
      .prepare(
        `SELECT s.id, s.tenant_id, t.name AS tenant_name, s.provider, s.status, s.cadence,
                COALESCE(t.package, 'starter') AS package,
                s.current_period_end, s.updated_at
         FROM billing_subscriptions s
         JOIN tenants t ON t.id = s.tenant_id
         ORDER BY s.updated_at DESC`,
      )
      .all() as Record<string, unknown>[]
  ).map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name),
    provider: String(row.provider),
    status: String(row.status),
    cadence: String(row.cadence),
    package: String(row.package),
    currentPeriodEnd: row.current_period_end ? String(row.current_period_end) : null,
    updatedAt: String(row.updated_at),
  }))
}

export type PlatformListingRow = {
  unitId: string
  code: string
  status: string
  listed: boolean
  propertyName: string
  propertySlug: string
  tenantName: string
  tenantId: string
  area: string
  sqft: number
}

export function listPlatformListingsInventory(): PlatformListingRow[] {
  const db = getDb()
  const cols = db.prepare("PRAGMA table_info(units)").all() as { name: string }[]
  const hasListedCol = cols.some((c) => c.name === "listed")
  const listedExpr = hasListedCol
    ? "CASE WHEN u.listed = 1 THEN 1 ELSE 0 END"
    : "CASE WHEN u.listed_at IS NOT NULL THEN 1 ELSE 0 END"
  return (
    db
      .prepare(
        `SELECT u.id AS unit_id, u.code, u.status, u.sqft,
                (${listedExpr}) AS listed,
                p.name AS property_name, p.slug AS property_slug, p.area,
                t.id AS tenant_id, t.name AS tenant_name
         FROM units u
         JOIN properties p ON p.id = u.property_id
         JOIN tenants t ON t.id = p.tenant_id
         ORDER BY t.name, p.name, u.code`,
      )
      .all() as Record<string, unknown>[]
  ).map((row) => ({
    unitId: String(row.unit_id),
    code: String(row.code),
    status: String(row.status),
    listed: Number(row.listed) === 1,
    propertyName: String(row.property_name),
    propertySlug: String(row.property_slug),
    tenantName: String(row.tenant_name),
    tenantId: String(row.tenant_id),
    area: String(row.area ?? ""),
    sqft: Number(row.sqft ?? 0),
  }))
}

export type MemoryTenantStat = {
  tenantId: string
  tenantName: string
  count: number
  latestAt: string | null
}

export function listAskEasyMemoryStats(): MemoryTenantStat[] {
  return (
    getDb()
      .prepare(
        `SELECT m.tenant_id, t.name AS tenant_name,
                COUNT(*) AS c, MAX(m.updated_at) AS latest_at
         FROM agent_memory m
         JOIN tenants t ON t.id = m.tenant_id
         GROUP BY m.tenant_id
         ORDER BY c DESC, t.name`,
      )
      .all() as Record<string, unknown>[]
  ).map((row) => ({
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name),
    count: Number(row.c ?? 0),
    latestAt: row.latest_at ? String(row.latest_at) : null,
  }))
}

export function countrySchemaSnapshot() {
  const market = activeMarket()
  return {
    liveIso: LIVE_MARKET.iso,
    liveName: LIVE_MARKET.name,
    activeId: ACTIVE_MARKET_ID,
    currency: market.currency,
    locale: market.locale,
    phoneCountryCode: market.phoneCountryCode,
    gstLabel: market.gstLabel,
    gstRateBps: market.gstRateBps,
    pinLabel: market.pinLabel,
    paymentMethods: market.primaryPaymentMethods.map((m) => m.label),
    idDocuments: market.idDocuments.map((d) => d.label),
    registeredMarkets: Object.keys(MARKETS),
  }
}

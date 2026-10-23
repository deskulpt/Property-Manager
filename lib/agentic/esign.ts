/**
 * India-capable eSign adapters for Ask Easy lease onboard.
 *
 * Digio / eMudhra shaped request builders + env key wiring.
 * `send()` runs only after landlord Approve on `propose_esign_send`.
 * Live HTTP stays off unless ESIGN_LIVE=1 (still requires provider keys).
 * Never collect or store raw Aadhaar numbers — phone / licensed KYC ref only.
 */

import { createHash } from "node:crypto"

export type ESignProviderId = "demo" | "docusign" | "digio" | "emudhra"

/** Signer for envelope create — phone enables India Aadhaar-OTP style flows. */
export type ESignSigner = {
  role: string
  name: string
  email: string
  /** E.164 or local IN mobile — Digio/eMudhra OTP channel. */
  phone?: string
  /**
   * Optional licensed KYC / customer ref from the verification provider.
   * Never a raw 12-digit Aadhaar.
   */
  kycRef?: string
}

export type ESignSendRequest = {
  agreementId: string
  tenantId: string
  signers: ESignSigner[]
  documentHtml: string
  country: string
  region: string
  /** Absolute callback URL for provider webhooks (from ESIGN_CALLBACK_URL). */
  callbackUrl?: string
}

export type ESignSendResult =
  | {
      ok: true
      provider: ESignProviderId
      envelopeId: string
      status: "sent"
      /** Provider-shaped create body (audit / dry-run inspection). */
      shaped?: Record<string, unknown>
      mode: "demo" | "dry_run" | "live"
    }
  | {
      ok: false
      error: string
    }

export interface ESignProvider {
  readonly id: ESignProviderId
  /** Never called without an approved propose_esign_send proposal. */
  send(req: ESignSendRequest): ESignSendResult
}

export type DigioCredentials = {
  clientId: string
  clientSecret: string
  baseUrl: string
}

export type EmudhraCredentials = {
  aspId: string
  apiKey: string
  baseUrl: string
}

/** Digio document eSign create — field names mirror Digio’s public shape. */
export type DigioCreateRequestShape = {
  file_name: string
  signers: {
    name: string
    email: string
    identifier: string
    sign_type: "aadhaar" | "electronic"
    reason: string
  }[]
  expire_in_days: number
  display_on_page: "all"
  notify_signers: boolean
  send_sign_link: boolean
  generate_access_token: boolean
  comment: string
  /** Base64 HTML when live; omitted in dry-run summaries. */
  file_data?: string
  post_processing?: {
    webhook?: { url: string }
  }
}

/** eMudhra ASP eSign initiate — India ESP-shaped fields. */
export type EmudhraCreateRequestShape = {
  aspId: string
  transactionId: string
  documentName: string
  documentHashSha256: string
  documentMimeType: "text/html"
  responseUrl: string
  signers: {
    name: string
    email: string
    mobile: string
    signerId: string
    authMode: "OTP" | "BIOMETRIC"
  }[]
  jurisdiction: { country: string; region: string }
  reason: string
}

const DEFAULT_DIGIO_BASE = "https://api.digio.in"
const DEFAULT_EMUDHRA_BASE = "https://api.emudhra.com"

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex")
}

function looksLikeRawAadhaar(value: string | undefined): boolean {
  if (!value) return false
  const digits = value.replace(/\s+/g, "")
  return /^\d{12}$/.test(digits)
}

function validateSendBasics(req: ESignSendRequest): string | null {
  if (!req.signers.length) {
    return "At least one signer (primary tenant) is required."
  }
  if (!req.documentHtml.trim()) {
    return "Agreement document is empty."
  }
  for (const s of req.signers) {
    if (looksLikeRawAadhaar(s.kycRef) || looksLikeRawAadhaar(s.email) || looksLikeRawAadhaar(s.phone)) {
      return "Raw Aadhaar numbers are not accepted — use phone or a licensed KYC ref."
    }
  }
  return null
}

function preferIndiaSignType(country: string): "aadhaar" | "electronic" {
  return country.toUpperCase() === "IN" ? "aadhaar" : "electronic"
}

export function buildDigioCreateRequest(
  req: ESignSendRequest,
  opts?: { includeFileData?: boolean },
): DigioCreateRequestShape {
  const signType = preferIndiaSignType(req.country)
  const body: DigioCreateRequestShape = {
    file_name: `lease-${req.agreementId}.html`,
    signers: req.signers.map((s) => ({
      name: s.name,
      email: s.email,
      identifier: (s.phone?.trim() || s.kycRef?.trim() || s.email).trim(),
      sign_type: signType,
      reason: `Lease agreement ${req.country}/${req.region}`,
    })),
    expire_in_days: 10,
    display_on_page: "all",
    notify_signers: true,
    send_sign_link: true,
    generate_access_token: true,
    comment: `tenant=${req.tenantId};agreement=${req.agreementId}`,
  }
  if (opts?.includeFileData) {
    body.file_data = Buffer.from(req.documentHtml, "utf8").toString("base64")
  }
  if (req.callbackUrl) {
    body.post_processing = { webhook: { url: req.callbackUrl } }
  }
  return body
}

export function buildEmudhraCreateRequest(
  req: ESignSendRequest,
  aspId: string,
): EmudhraCreateRequestShape {
  const transactionId = `em-${req.agreementId.slice(0, 12)}-${Date.now().toString(36)}`
  return {
    aspId,
    transactionId,
    documentName: `lease-${req.agreementId}.html`,
    documentHashSha256: sha256Hex(req.documentHtml),
    documentMimeType: "text/html",
    responseUrl: req.callbackUrl || "",
    signers: req.signers.map((s, i) => ({
      name: s.name,
      email: s.email,
      mobile: (s.phone || "").trim(),
      signerId: s.kycRef?.trim() || `${s.role}-${i + 1}`,
      authMode: req.country.toUpperCase() === "IN" ? "OTP" : "OTP",
    })),
    jurisdiction: { country: req.country, region: req.region },
    reason: `Lease agreement ${req.country}/${req.region}`,
  }
}

export function readDigioCredentials(
  env: NodeJS.ProcessEnv = process.env,
): DigioCredentials | null {
  const clientId = env.DIGIO_CLIENT_ID?.trim()
  const clientSecret = env.DIGIO_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null
  return {
    clientId,
    clientSecret,
    baseUrl: (env.DIGIO_BASE_URL?.trim() || DEFAULT_DIGIO_BASE).replace(/\/$/, ""),
  }
}

export function readEmudhraCredentials(
  env: NodeJS.ProcessEnv = process.env,
): EmudhraCredentials | null {
  const aspId = env.EMUDHRA_ASP_ID?.trim()
  const apiKey = env.EMUDHRA_API_KEY?.trim() || env.EMUDHRA_ASP_PASSWORD?.trim()
  if (!aspId || !apiKey) return null
  return {
    aspId,
    apiKey,
    baseUrl: (env.EMUDHRA_BASE_URL?.trim() || DEFAULT_EMUDHRA_BASE).replace(/\/$/, ""),
  }
}

export function isESignLive(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ESIGN_LIVE === "1"
}

export function readESignCallbackUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const url = env.ESIGN_CALLBACK_URL?.trim()
  return url || undefined
}

/** Resolve provider id from ESIGN_PROVIDER (default demo). */
export function resolveESignProviderId(
  env: NodeJS.ProcessEnv = process.env,
): ESignProviderId {
  const raw = (env.ESIGN_PROVIDER || "demo").trim().toLowerCase()
  if (raw === "digio" || raw === "emudhra" || raw === "docusign" || raw === "demo") {
    return raw
  }
  return "demo"
}

export class DemoESignAdapter implements ESignProvider {
  readonly id: ESignProviderId = "demo"

  send(req: ESignSendRequest): ESignSendResult {
    const err = validateSendBasics(req)
    if (err) return { ok: false, error: err }
    const envelopeId = `demo-env-${req.agreementId.slice(0, 8)}-${Date.now().toString(36)}`
    return { ok: true, provider: "demo", envelopeId, status: "sent", mode: "demo" }
  }
}

/**
 * Digio-shaped adapter. Requires DIGIO_CLIENT_ID + DIGIO_CLIENT_SECRET.
 * Default dry-run builds Digio create payload and returns a digio- envelope id.
 * ESIGN_LIVE=1 is reserved for real HTTP (refused until transport is wired).
 */
export class DigioESignAdapter implements ESignProvider {
  readonly id: ESignProviderId = "digio"

  constructor(private readonly creds: DigioCredentials) {}

  send(req: ESignSendRequest): ESignSendResult {
    const err = validateSendBasics(req)
    if (err) return { ok: false, error: err }
    if (req.country.toUpperCase() !== "IN") {
      return {
        ok: false,
        error: "Digio adapter is India-only (agreement country must be IN).",
      }
    }
    const withPhone = req.signers.some((s) => (s.phone || "").trim().length >= 10)
    if (!withPhone) {
      return {
        ok: false,
        error: "Digio Aadhaar eSign requires at least one signer mobile (+91).",
      }
    }

    const shaped = buildDigioCreateRequest(req, { includeFileData: false })
    if (isESignLive()) {
      return {
        ok: false,
        error:
          `Digio live HTTP is not enabled in this build (base ${this.creds.baseUrl}). ` +
          "Unset ESIGN_LIVE or use dry-run with keys present.",
      }
    }

    const envelopeId = `digio-dry-${req.agreementId.slice(0, 8)}-${Date.now().toString(36)}`
    return {
      ok: true,
      provider: "digio",
      envelopeId,
      status: "sent",
      shaped: shaped as unknown as Record<string, unknown>,
      mode: "dry_run",
    }
  }
}

/**
 * eMudhra ASP-shaped adapter. Requires EMUDHRA_ASP_ID + EMUDHRA_API_KEY.
 * Dry-run default; live HTTP gated by ESIGN_LIVE (refused until transport wired).
 */
export class EmudhraESignAdapter implements ESignProvider {
  readonly id: ESignProviderId = "emudhra"

  constructor(private readonly creds: EmudhraCredentials) {}

  send(req: ESignSendRequest): ESignSendResult {
    const err = validateSendBasics(req)
    if (err) return { ok: false, error: err }
    if (req.country.toUpperCase() !== "IN") {
      return {
        ok: false,
        error: "eMudhra adapter is India-only (agreement country must be IN).",
      }
    }
    const withPhone = req.signers.some((s) => (s.phone || "").trim().length >= 10)
    if (!withPhone) {
      return {
        ok: false,
        error: "eMudhra OTP eSign requires at least one signer mobile (+91).",
      }
    }

    const shaped = buildEmudhraCreateRequest(req, this.creds.aspId)
    if (!shaped.responseUrl) {
      return {
        ok: false,
        error: "ESIGN_CALLBACK_URL is required for eMudhra envelopes.",
      }
    }
    if (isESignLive()) {
      return {
        ok: false,
        error:
          `eMudhra live HTTP is not enabled in this build (base ${this.creds.baseUrl}). ` +
          "Unset ESIGN_LIVE or use dry-run with keys present.",
      }
    }

    const envelopeId = shaped.transactionId
    return {
      ok: true,
      provider: "emudhra",
      envelopeId,
      status: "sent",
      shaped: shaped as unknown as Record<string, unknown>,
      mode: "dry_run",
    }
  }
}

/** DocuSign placeholder — CA/US later; not India-primary. */
export class DocuSignESignAdapter implements ESignProvider {
  readonly id: ESignProviderId = "docusign"

  send(_req: ESignSendRequest): ESignSendResult {
    return {
      ok: false,
      error:
        "DocuSign adapter is not wired. For India use ESIGN_PROVIDER=digio|emudhra with keys, or demo.",
    }
  }
}

export function resolveESignProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ESignProvider {
  const id = resolveESignProviderId(env)
  if (id === "digio") {
    const creds = readDigioCredentials(env)
    if (!creds) {
      return new MissingKeysProvider(
        "digio",
        "Digio selected but DIGIO_CLIENT_ID / DIGIO_CLIENT_SECRET are unset.",
      )
    }
    return new DigioESignAdapter(creds)
  }
  if (id === "emudhra") {
    const creds = readEmudhraCredentials(env)
    if (!creds) {
      return new MissingKeysProvider(
        "emudhra",
        "eMudhra selected but EMUDHRA_ASP_ID / EMUDHRA_API_KEY are unset.",
      )
    }
    return new EmudhraESignAdapter(creds)
  }
  if (id === "docusign") {
    return new DocuSignESignAdapter()
  }
  return new DemoESignAdapter()
}

class MissingKeysProvider implements ESignProvider {
  constructor(
    readonly id: ESignProviderId,
    private readonly message: string,
  ) {}

  send(_req: ESignSendRequest): ESignSendResult {
    return { ok: false, error: this.message }
  }
}

let overrideProvider: ESignProvider | null = null

export function getESignProvider(): ESignProvider {
  if (overrideProvider) return overrideProvider
  return resolveESignProviderFromEnv()
}

/** Test hook — do not call from Ask Easy prompt path. */
export function setESignProvider(provider: ESignProvider | null) {
  overrideProvider = provider
}

/** Attach env callback URL onto a send request. */
export function withESignEnvDefaults(req: ESignSendRequest): ESignSendRequest {
  if (req.callbackUrl) return req
  const callbackUrl = readESignCallbackUrl()
  return callbackUrl ? { ...req, callbackUrl } : req
}

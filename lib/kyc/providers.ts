import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

export type KycProviderName = "demo" | "idfy" | "signzy" | "hyperverge"

export type KycStartInput = {
  userId: string
  email: string
  name: string
  returnUrl: string
  /** Consent already recorded by caller */
  consentVersion: string
}

export type KycStartResult =
  | {
      ok: true
      provider: KycProviderName
      sessionId: string
      redirectUrl: string
      labelledDemo: boolean
    }
  | { ok: false; error: string }

export type KycWebhookResult =
  | {
      ok: true
      provider: KycProviderName
      sessionId: string
      status: "pending" | "approved" | "declined"
      providerRef: string
    }
  | { ok: false; error: string }

export interface KycProvider {
  readonly name: KycProviderName
  startSession(input: KycStartInput): Promise<KycStartResult>
  verifyWebhook(input: {
    rawBody: string
    signatureHeader: string | null
  }): Promise<KycWebhookResult>
}

function hmacOk(secret: string, rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  const provided = signatureHeader.replace(/^sha256=/i, "").trim()
  try {
    const a = Buffer.from(expected)
    const b = Buffer.from(provided)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export const demoKycProvider: KycProvider = {
  name: "demo",
  async startSession(input) {
    const sessionId = `kyc_demo_${input.userId}_${Date.now()}`
    return {
      ok: true,
      provider: "demo",
      sessionId,
      redirectUrl: `/account/verify/callback?session=${encodeURIComponent(sessionId)}&status=approved`,
      labelledDemo: true,
    }
  },
  async verifyWebhook({ rawBody }) {
    try {
      const payload = JSON.parse(rawBody) as Record<string, unknown>
      return {
        ok: true,
        provider: "demo",
        sessionId: String(payload.sessionId ?? ""),
        status: (String(payload.status ?? "approved") as "pending" | "approved" | "declined"),
        providerRef: String(payload.providerRef ?? "DEMO-KYC"),
      }
    } catch {
      return { ok: false, error: "Invalid JSON." }
    }
  },
}

function stubRedirectProvider(name: KycProviderName, envSecret: string): KycProvider {
  return {
    name,
    async startSession(input) {
      const live = process.env.KYC_LIVE === "1"
      const sessionId = `kyc_${name}_${input.userId}_${Date.now()}`
      if (!live) {
        return {
          ok: true,
          provider: name,
          sessionId,
          redirectUrl: `/account/verify/callback?session=${encodeURIComponent(sessionId)}&status=approved&provider=${name}`,
          labelledDemo: true,
        }
      }
      return {
        ok: true,
        provider: name,
        sessionId,
        redirectUrl: `https://kyc-stub.example/${name}/start?session=${encodeURIComponent(sessionId)}&return=${encodeURIComponent(input.returnUrl)}`,
        labelledDemo: false,
      }
    },
    async verifyWebhook({ rawBody, signatureHeader }) {
      const secret = process.env[envSecret]?.trim()
      if (!secret) return { ok: false, error: `${envSecret} is not configured.` }
      if (!hmacOk(secret, rawBody, signatureHeader)) {
        return { ok: false, error: "Invalid KYC webhook signature." }
      }
      try {
        const payload = JSON.parse(rawBody) as Record<string, unknown>
        return {
          ok: true,
          provider: name,
          sessionId: String(payload.sessionId ?? payload.session_id ?? ""),
          status: (String(payload.status ?? "approved") as "pending" | "approved" | "declined"),
          providerRef: String(payload.providerRef ?? payload.reference ?? `${name.toUpperCase()}-REF`),
        }
      } catch {
        return { ok: false, error: "Invalid JSON." }
      }
    },
  }
}

export const idfyKycProvider = stubRedirectProvider("idfy", "IDFY_WEBHOOK_SECRET")
export const signzyKycProvider = stubRedirectProvider("signzy", "SIGNZY_WEBHOOK_SECRET")
export const hypervergeKycProvider = stubRedirectProvider("hyperverge", "HYPERVERGE_WEBHOOK_SECRET")

export function resolveKycProvider(): KycProvider {
  const raw = (process.env.KYC_PROVIDER ?? "demo").trim().toLowerCase()
  if (raw === "idfy") return idfyKycProvider
  if (raw === "signzy") return signzyKycProvider
  if (raw === "hyperverge") return hypervergeKycProvider
  return demoKycProvider
}

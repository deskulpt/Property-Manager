import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  DemoESignAdapter,
  DigioESignAdapter,
  EmudhraESignAdapter,
  buildDigioCreateRequest,
  buildEmudhraCreateRequest,
  resolveESignProviderFromEnv,
  resolveESignProviderId,
  setESignProvider,
  type ESignSendRequest,
} from "@/lib/agentic/esign"

const baseReq = (): ESignSendRequest => ({
  agreementId: "agr_test_india_001",
  tenantId: "t_bbm",
  country: "IN",
  region: "MH",
  documentHtml: "<html><body>Lease — not legal advice</body></html>",
  signers: [
    {
      role: "primary",
      name: "Priya Sharma",
      email: "priya.signer@example.com",
      phone: "+91 98765 43210",
    },
  ],
  callbackUrl: "https://easyrental.example/api/esign/callback",
})

const ENV_KEYS = [
  "ESIGN_PROVIDER",
  "ESIGN_LIVE",
  "ESIGN_CALLBACK_URL",
  "DIGIO_CLIENT_ID",
  "DIGIO_CLIENT_SECRET",
  "DIGIO_BASE_URL",
  "EMUDHRA_ASP_ID",
  "EMUDHRA_API_KEY",
  "EMUDHRA_ASP_PASSWORD",
  "EMUDHRA_BASE_URL",
] as const

describe("eSign Digio / eMudhra adapters", () => {
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    setESignProvider(null)
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    setESignProvider(null)
    for (const key of ENV_KEYS) {
      const value = saved[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it("defaults to demo provider", () => {
    expect(resolveESignProviderId()).toBe("demo")
    expect(resolveESignProviderFromEnv().id).toBe("demo")
    const sent = new DemoESignAdapter().send(baseReq())
    expect(sent.ok).toBe(true)
    if (sent.ok) {
      expect(sent.provider).toBe("demo")
      expect(sent.mode).toBe("demo")
      expect(sent.envelopeId).toMatch(/^demo-env-/)
    }
  })

  it("builds Digio-shaped create body with aadhaar sign_type for IN", () => {
    const shaped = buildDigioCreateRequest(baseReq())
    expect(shaped.signers[0]?.sign_type).toBe("aadhaar")
    expect(shaped.signers[0]?.identifier).toMatch(/98765/)
    expect(shaped.file_name).toMatch(/lease-agr_test/)
    expect(shaped.notify_signers).toBe(true)
  })

  it("builds eMudhra-shaped create body with OTP auth and sha256", () => {
    const shaped = buildEmudhraCreateRequest(baseReq(), "asp_demo")
    expect(shaped.aspId).toBe("asp_demo")
    expect(shaped.signers[0]?.authMode).toBe("OTP")
    expect(shaped.signers[0]?.mobile).toMatch(/98765/)
    expect(shaped.documentHashSha256).toHaveLength(64)
    expect(shaped.jurisdiction).toEqual({ country: "IN", region: "MH" })
  })

  it("Digio dry-run succeeds with keys; refuses missing phone and non-IN", () => {
    const digio = new DigioESignAdapter({
      clientId: "cid",
      clientSecret: "sec",
      baseUrl: "https://api.digio.in",
    })
    const ok = digio.send(baseReq())
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.provider).toBe("digio")
      expect(ok.mode).toBe("dry_run")
      expect(ok.envelopeId).toMatch(/^digio-dry-/)
      expect(ok.shaped?.signers).toBeTruthy()
    }

    const noPhone = digio.send({
      ...baseReq(),
      signers: [{ role: "primary", name: "X", email: "x@example.com" }],
    })
    expect(noPhone.ok).toBe(false)

    const ca = digio.send({ ...baseReq(), country: "CA", region: "ON" })
    expect(ca.ok).toBe(false)
  })

  it("eMudhra dry-run needs callback URL; refuses raw Aadhaar", () => {
    const emu = new EmudhraESignAdapter({
      aspId: "asp_1",
      apiKey: "key",
      baseUrl: "https://api.emudhra.com",
    })
    const ok = emu.send(baseReq())
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.provider).toBe("emudhra")
      expect(ok.mode).toBe("dry_run")
      expect(ok.envelopeId).toMatch(/^em-/)
    }

    const noCb = emu.send({ ...baseReq(), callbackUrl: undefined })
    expect(noCb.ok).toBe(false)

    const raw = emu.send({
      ...baseReq(),
      signers: [
        {
          role: "primary",
          name: "X",
          email: "x@example.com",
          phone: "+919876543210",
          kycRef: "123456789012",
        },
      ],
    })
    expect(raw.ok).toBe(false)
    if (!raw.ok) expect(raw.error).toMatch(/Aadhaar/i)
  })

  it("env resolve: digio/emudhra without keys fail on send; with keys dry-run", () => {
    process.env.ESIGN_PROVIDER = "digio"
    const missing = resolveESignProviderFromEnv()
    expect(missing.id).toBe("digio")
    expect(missing.send(baseReq()).ok).toBe(false)

    process.env.DIGIO_CLIENT_ID = "cid"
    process.env.DIGIO_CLIENT_SECRET = "sec"
    const digio = resolveESignProviderFromEnv()
    expect(digio).toBeInstanceOf(DigioESignAdapter)
    expect(digio.send(baseReq()).ok).toBe(true)

    process.env.ESIGN_PROVIDER = "emudhra"
    process.env.EMUDHRA_ASP_ID = "asp"
    process.env.EMUDHRA_API_KEY = "key"
    process.env.ESIGN_CALLBACK_URL = "https://easyrental.example/api/esign/callback"
    const emu = resolveESignProviderFromEnv()
    expect(emu).toBeInstanceOf(EmudhraESignAdapter)
    const sent = emu.send({ ...baseReq(), callbackUrl: undefined })
    // withESignEnvDefaults is executor-side; adapter alone needs callback on req
    expect(sent.ok).toBe(false)

    const withCb = emu.send(baseReq())
    expect(withCb.ok).toBe(true)
  })

  it("ESIGN_LIVE=1 refuses live HTTP until transport is wired", () => {
    process.env.ESIGN_LIVE = "1"
    const digio = new DigioESignAdapter({
      clientId: "cid",
      clientSecret: "sec",
      baseUrl: "https://api.digio.in",
    })
    const live = digio.send(baseReq())
    expect(live.ok).toBe(false)
    if (!live.ok) expect(live.error).toMatch(/live HTTP/i)
  })
})

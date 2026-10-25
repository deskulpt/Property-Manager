import "server-only"
import { isProduction } from "@/lib/env"

export type OtpChannel = "sms" | "email"

export type OtpSendResult =
  | { ok: true; provider: string; labelledDemo: boolean; /** Never set in production */ demoCode?: string | null }
  | { ok: false; error: string }

export interface OtpDeliveryProvider {
  readonly name: string
  readonly channel: OtpChannel
  send(input: { to: string; code: string; purpose: string }): Promise<OtpSendResult>
}

/** Local / test — does not transmit. May echo code only outside production. */
export const demoOtpProvider: OtpDeliveryProvider = {
  name: "demo",
  channel: "sms",
  async send({ code }) {
    return {
      ok: true,
      provider: "demo",
      labelledDemo: true,
      demoCode: isProduction() ? null : code,
    }
  },
}

/** MSG91-shaped SMS adapter (test stub — no live HTTP). */
export const msg91OtpProvider: OtpDeliveryProvider = {
  name: "msg91",
  channel: "sms",
  async send({ to, code, purpose }) {
    const key = process.env.MSG91_AUTH_KEY?.trim()
    if (!key || process.env.OTP_LIVE !== "1") {
      return {
        ok: true,
        provider: "msg91",
        labelledDemo: true,
        demoCode: isProduction() ? null : code,
      }
    }
    void to
    void purpose
    // Live path reserved — never return the code.
    return { ok: true, provider: "msg91", labelledDemo: false, demoCode: null }
  },
}

/** Twilio-shaped SMS adapter (test stub). */
export const twilioOtpProvider: OtpDeliveryProvider = {
  name: "twilio",
  channel: "sms",
  async send({ to, code }) {
    const sid = process.env.TWILIO_ACCOUNT_SID?.trim()
    const token = process.env.TWILIO_AUTH_TOKEN?.trim()
    if (!sid || !token || process.env.OTP_LIVE !== "1") {
      return {
        ok: true,
        provider: "twilio",
        labelledDemo: true,
        demoCode: isProduction() ? null : code,
      }
    }
    void to
    void code
    return { ok: true, provider: "twilio", labelledDemo: false, demoCode: null }
  },
}

/** Transactional email OTP adapter (test stub). */
export const emailOtpProvider: OtpDeliveryProvider = {
  name: "email",
  channel: "email",
  async send({ to, code, purpose }) {
    const key = process.env.EMAIL_OTP_API_KEY?.trim() || process.env.RESEND_API_KEY?.trim()
    if (!key || process.env.OTP_LIVE !== "1") {
      return {
        ok: true,
        provider: "email",
        labelledDemo: true,
        demoCode: isProduction() ? null : code,
      }
    }
    void to
    void purpose
    void code
    return { ok: true, provider: "email", labelledDemo: false, demoCode: null }
  },
}

export function resolveSmsOtpProvider(): OtpDeliveryProvider {
  const raw = (process.env.OTP_SMS_PROVIDER ?? "demo").trim().toLowerCase()
  if (raw === "msg91") return msg91OtpProvider
  if (raw === "twilio") return twilioOtpProvider
  return demoOtpProvider
}

export function resolveEmailOtpProvider(): OtpDeliveryProvider {
  const raw = (process.env.OTP_EMAIL_PROVIDER ?? "email").trim().toLowerCase()
  if (raw === "demo") return demoOtpProvider
  return emailOtpProvider
}

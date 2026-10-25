import "server-only"

/**
 * Runtime environment helpers for Easy Rental.
 * Production must set DESKULPT_SECRET_KEY. Demo switcher is off in production unless explicitly enabled.
 */

export function isProduction() {
  return process.env.NODE_ENV === "production"
}

/** Signed cookies / AES for Razorpay secrets. Required in production. */
export function requireSecretKey(): string {
  const key = process.env.DESKULPT_SECRET_KEY?.trim()
  if (key && key.length >= 16) return key
  if (isProduction()) {
    throw new Error(
      "DESKULPT_SECRET_KEY is required in production (min 16 characters). Set it in the host environment.",
    )
  }
  return "deskulpt-local-demo-secret-v1"
}

export function secretKeyConfigured() {
  const key = process.env.DESKULPT_SECRET_KEY?.trim()
  return Boolean(key && key.length >= 16)
}

/**
 * Demo identity switcher (impersonation). Off in production unless DESKULPT_DEMO_SWITCHER=1.
 * Never enable on a public production deployment that holds real landlord data.
 */
export function isDemoSwitcherEnabled() {
  if (process.env.DESKULPT_DEMO_SWITCHER === "1") return true
  if (process.env.DESKULPT_DEMO_SWITCHER === "0") return false
  return !isProduction()
}

export function sessionCookieOptions(maxAge = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: isProduction(),
  }
}

export const ENV_CHECKLIST = [
  {
    name: "DESKULPT_SECRET_KEY",
    requiredInProd: true,
    note: "HMAC session tokens + AES for shop secrets (min 16 chars)",
  },
  {
    name: "DESKULPT_DB_PATH",
    requiredInProd: false,
    note: "SQLite file path; default data/deskulpt.sqlite (use a persistent volume on Railway)",
  },
  {
    name: "DESKULPT_DEMO_SWITCHER",
    requiredInProd: false,
    note: "Set to 1 only for labelled demo deployments; leave unset/0 in production",
  },
  {
    name: "GOOGLE_CLOUD_TRANSLATION_API_KEY",
    requiredInProd: false,
    note: "Optional CMS language translation",
  },
  {
    name: "NODE_ENV",
    requiredInProd: true,
    note: "Must be production on Railway",
  },
  {
    name: "BILLING_PROVIDER",
    requiredInProd: false,
    note: "dodo (default) | stripe | demo — platform MoR swap",
  },
  {
    name: "DODO_WEBHOOK_SECRET",
    requiredInProd: false,
    note: "HMAC for /api/billing/webhook when using Dodo",
  },
  {
    name: "OTP_SMS_PROVIDER",
    requiredInProd: false,
    note: "demo | msg91 | twilio — never returns codes in production",
  },
  {
    name: "KYC_PROVIDER",
    requiredInProd: false,
    note: "demo | idfy | signzy | hyperverge",
  },
] as const

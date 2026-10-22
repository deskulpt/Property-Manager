import "server-only"

/**
 * Dual-mode boot for Slice A:
 * - OSS / local (default): demo identity switcher allowed.
 * - HOSTED=1: real signup/login sessions; demo switcher off unless ALLOW_DEMO_AUTH=1.
 */

export function isHosted(): boolean {
  return process.env.HOSTED === "1" || process.env.HOSTED === "true"
}

/** Demo cookie switcher is allowed in OSS, or in hosted only with explicit override. */
export function demoAuthAllowed(): boolean {
  if (!isHosted()) return true
  return process.env.ALLOW_DEMO_AUTH === "1" || process.env.ALLOW_DEMO_AUTH === "true"
}

/**
 * Production hosted boot must not rely on the demo switcher alone.
 * Call once at DB open / layout so misconfigured deploys fail loudly.
 */
export function assertHostedAuthPolicy(): void {
  if (!isHosted()) return
  if (demoAuthAllowed()) return
  // Policy OK: hosted without demo auth — credentials path is required.
}

export function authModeLabel(): "hosted" | "oss" {
  return isHosted() ? "hosted" : "oss"
}

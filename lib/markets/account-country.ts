/**
 * Accounts are bound to one CountryPack ISO — fail-closed cross-country access
 * (platform L0/L1 may operate across countries).
 */

import { normalizeMarketIso } from "@/lib/markets/cookie"
import { builtinPack } from "@/lib/markets/packs"
import { isKnownPathSegment, pathSegmentForIso } from "@/lib/markets/path-segments"

export function isValidAccountCountry(iso: string): boolean {
  const normalized = normalizeMarketIso(iso)
  return builtinPack(normalized) != null || isKnownPathSegment(pathSegmentForIso(normalized))
}

export function assertAccountCountryMatch(input: {
  accountIso: string | null | undefined
  requestIso: string
  roleLevel?: number | null
}): { ok: true } | { ok: false; error: string } {
  // L0 SuperAdmin / L1 Admin — platform ops across countries.
  if (input.roleLevel != null && input.roleLevel <= 1) return { ok: true }

  const account = normalizeMarketIso(input.accountIso ?? "IN")
  const request = normalizeMarketIso(input.requestIso)
  if (account !== request) {
    return {
      ok: false,
      error: `This account is bound to ${account}. Open /${pathSegmentForIso(account)} or use an account for ${request}.`,
    }
  }
  return { ok: true }
}

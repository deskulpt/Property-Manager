/**
 * Accounts are bound to one CountryPack ISO — fail-closed cross-country access.
 * CTO #47: L0/L1 do **not** bypass — use the active `/in` or `/ca` path.
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
  /** Ignored — retained for call-site compat; no role bypass (CTO). */
  roleLevel?: number | null
}): { ok: true } | { ok: false; error: string } {
  void input.roleLevel
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

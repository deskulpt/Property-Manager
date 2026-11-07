import "server-only"
import { NextResponse } from "next/server"
import { normalizeMarketIso } from "@/lib/markets/cookie"
import { assertCountryDataScope, assertLiveModelAllowed } from "@/lib/markets/enforce"
import { requestCountryIso } from "@/lib/markets/request-country"

type SessionLike = {
  countryIso?: string | null
  roleLevel?: number | null
  tenantCountryIso?: string | null
  tenantId?: string | null
}

/**
 * API routes: resolve request country and optionally bind session/resource country.
 * Blocks cross-country for all roles including L0/L1.
 */
export async function guardApiCountry(input?: {
  session?: SessionLike | null
  resourceCountryIso?: string | null
  /** When true, also require realPiiAiConnectorsMedia for this request. */
  requireLiveAi?: boolean
}): Promise<
  | { ok: true; requestIso: string }
  | { ok: false; response: NextResponse }
> {
  const requestIso = await requestCountryIso()
  if (input?.session) {
    const accountIso = input.session.countryIso ?? input.session.tenantCountryIso ?? null
    if (accountIso) {
      const scope = assertCountryDataScope({
        requestIso,
        resourceIso: accountIso,
        label: "session",
      })
      if (!scope.ok) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: scope.error, code: scope.code },
            { status: 403 },
          ),
        }
      }
    }
  }
  if (input?.resourceCountryIso) {
    const scope = assertCountryDataScope({
      requestIso,
      resourceIso: input.resourceCountryIso,
      label: "resource",
    })
    if (!scope.ok) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: scope.error, code: scope.code },
          { status: 403 },
        ),
      }
    }
  }
  if (input?.requireLiveAi) {
    const ai = assertLiveModelAllowed(requestIso)
    if (!ai.ok) {
      return {
        ok: false,
        response: NextResponse.json({ error: ai.error, code: ai.code }, { status: 403 }),
      }
    }
  }
  return { ok: true, requestIso: normalizeMarketIso(requestIso) }
}

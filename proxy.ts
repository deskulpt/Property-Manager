import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { MARKET_COOKIE, MARKET_COOKIE_MAX_AGE, normalizeMarketIso } from "@/lib/markets/cookie"
import {
  COUNTRY_CONSENT_COOKIE,
  COUNTRY_CONSENT_MAX_AGE,
  COUNTRY_HEADER,
  isCountryExemptPath,
  isKnownPathSegment,
  isoForPathSegment,
  pathSegmentForIso,
  stripCountryPrefix,
} from "@/lib/markets/path-segments"

function withCountryHeaders(request: NextRequest, iso: string, requestHeaders?: Headers) {
  const headers = requestHeaders ?? new Headers(request.headers)
  headers.set(COUNTRY_HEADER, iso)
  return headers
}

function applyCountryCookies(response: NextResponse, iso: string, consent: boolean) {
  const normalized = normalizeMarketIso(iso)
  response.cookies.set(MARKET_COOKIE, normalized, {
    path: "/",
    maxAge: MARKET_COOKIE_MAX_AGE,
    sameSite: "lax",
  })
  if (consent) {
    response.cookies.set(COUNTRY_CONSENT_COOKIE, normalized, {
      path: "/",
      maxAge: COUNTRY_CONSENT_MAX_AGE,
      sameSite: "lax",
    })
  }
  return response
}

function rewriteToInternal(request: NextRequest, iso: string, internalPath: string) {
  const url = request.nextUrl.clone()
  // Country home `/in` → marketing home; other paths keep internal shape.
  url.pathname = internalPath === "/" ? "/home" : internalPath
  const headers = withCountryHeaders(request, iso)
  const response = NextResponse.rewrite(url, { request: { headers } })
  return applyCountryCookies(response, iso, true)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isCountryExemptPath(pathname)) {
    return NextResponse.next()
  }

  const stripped = stripCountryPrefix(pathname)
  if (stripped) {
    // Visiting `/in/...` or `/ca/...` is explicit consent for that country.
    return rewriteToInternal(request, stripped.iso, stripped.path === "/" ? "/" : stripped.path)
  }

  // Root = country picker — never auto-redirect without consent.
  if (pathname === "/" || pathname === "") {
    return NextResponse.next()
  }

  // First path segment looks like a future country code not yet in packs → 404 soft via next.
  const first = pathname.split("/")[1] ?? ""
  if (/^[a-z]{2}$/i.test(first) && !isKnownPathSegment(first)) {
    // Unknown `/xx` — do not invent a country; let app 404.
    return NextResponse.next()
  }

  const consentRaw = request.cookies.get(COUNTRY_CONSENT_COOKIE)?.value
  const consentIso = consentRaw ? normalizeMarketIso(consentRaw) : null
  const marketIso = normalizeMarketIso(request.cookies.get(MARKET_COOKIE)?.value ?? consentIso ?? "")

  if (consentIso && isoForPathSegment(pathSegmentForIso(consentIso))) {
    // 301 legacy URLs → /{segment}/...
    const segment = pathSegmentForIso(consentIso)
    const url = request.nextUrl.clone()
    url.pathname = `/${segment}${pathname === "/" ? "" : pathname}`
    const response = NextResponse.redirect(url, 301)
    return applyCountryCookies(response, consentIso, true)
  }

  // No consent — send to picker with return path (never geo auto-redirect).
  const picker = request.nextUrl.clone()
  picker.pathname = "/"
  picker.searchParams.set("next", pathname + (request.nextUrl.search || ""))
  if (marketIso && marketIso !== "IN") {
    // Soft suggest only via query — picker must still obtain consent.
    picker.searchParams.set("suggest", marketIso)
  }
  return NextResponse.redirect(picker, 302)
}

export const config = {
  matcher: [
    /*
     * Match all pathnames except static/image internals already filtered in isCountryExemptPath.
     * Keep matcher broad; exempt helper decides.
     */
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|webmanifest|js|css|map|wasm)$).*)",
  ],
}

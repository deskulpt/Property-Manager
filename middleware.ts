import { NextResponse, type NextRequest } from "next/server"
import { isValidRefCode, normalizeRefCode, REF_COOKIE, REF_COOKIE_MAX_AGE } from "@/lib/referrals"

/** First-touch referral attribution — 90-day cookie when `?ref=` is present. */
export function middleware(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("ref")
  const response = NextResponse.next()
  if (!raw || !isValidRefCode(raw)) return response
  if (request.cookies.get(REF_COOKIE)?.value) return response
  response.cookies.set(REF_COOKIE, normalizeRefCode(raw), {
    path: "/",
    maxAge: REF_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  })
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}

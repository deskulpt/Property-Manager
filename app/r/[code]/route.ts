import { NextResponse } from "next/server"
import { getReferrerByCode } from "@/lib/db"
import { isValidRefCode, normalizeRefCode } from "@/lib/referrals"

export function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  return context.params.then(({ code: raw }) => {
    if (!isValidRefCode(raw)) {
      return NextResponse.redirect(new URL("/signup", "http://127.0.0.1:3508"), 307)
    }
    const code = normalizeRefCode(raw)
    const referrer = getReferrerByCode(code)
    const dest = referrer
      ? `/signup?ref=${encodeURIComponent(code)}`
      : "/signup"
    // Relative redirect — host from request
    return NextResponse.redirect(new URL(dest, _request.url), 307)
  })
}

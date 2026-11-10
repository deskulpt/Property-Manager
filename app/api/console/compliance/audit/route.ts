import { NextResponse } from "next/server"
import { canOpenConsole } from "@/lib/role-level"
import { exportComplianceAuditCsv } from "@/lib/markets/legal-overrides"
import { getSessionUser } from "@/lib/session"

export const dynamic = "force-dynamic"

/** Treat datetime-local / bare ISO as UTC when no timezone is present. */
function coerceUtcParam(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) return new Date(trimmed).toISOString()
  const asUtc = trimmed.includes("T") ? `${trimmed}Z` : `${trimmed}T00:00:00.000Z`
  const ms = Date.parse(asUtc)
  if (Number.isNaN(ms)) return null
  return new Date(ms).toISOString()
}

/**
 * UTF-8 CSV export of append-only compliance audit events.
 * Query: ?from=ISO-UTC&to=ISO-UTC (optional date-range filters).
 */
export async function GET(request: Request) {
  const session = await getSessionUser()
  if (!session || !canOpenConsole(session.roleLevel)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const fromUtc = coerceUtcParam(url.searchParams.get("from"))
  const toUtc = coerceUtcParam(url.searchParams.get("to"))
  const exported = exportComplianceAuditCsv({ fromUtc, toUtc })

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  return new NextResponse(exported.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="compliance-audit-${stamp}.csv"`,
      "X-Export-Hash": exported.exportHash,
      "X-Export-Row-Count": String(exported.rowCount),
      "Cache-Control": "no-store",
    },
  })
}

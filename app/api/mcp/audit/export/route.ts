import { getSessionUser } from "@/lib/session"
import { exportDualControlAuditCsv } from "@/lib/agentic/audit"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** D09 books-exportable dual-control audit CSV (Finance). */
export async function GET(): Promise<Response> {
  const user = await getSessionUser()
  if (!user?.id || !user.tenantId) {
    return Response.json({ error: "authentication_required" }, { status: 401 })
  }
  if (user.roleLevel != null && user.roleLevel > 3) {
    return Response.json({ error: "insufficient_role" }, { status: 403 })
  }

  const csv = exportDualControlAuditCsv(user.tenantId)
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="dual-control-audit-${user.tenantId}.csv"`,
      "cache-control": "no-store",
    },
  })
}

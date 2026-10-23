import { NextResponse } from "next/server"
import { z } from "zod"
import { adkRuntimeMode, runAdkTurn } from "@/lib/adk"
import { askEasyGateReason } from "@/lib/agentic/gate"
import { getSessionUser } from "@/lib/session"

export const runtime = "nodejs"

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  scope: z.enum(["public", "landlord"]).default("public"),
  propertyId: z.string().optional().nullable(),
})

/**
 * ADK chat turn.
 * - public: catalog search only (no session)
 * - landlord: requires landlord_admin session; tenant_id from cookie only
 */
export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { message, scope, propertyId } = parsed.data

  if (scope === "public") {
    const turn = await runAdkTurn({
      message,
      scope: "public",
      propertyId: propertyId ?? null,
    })
    return NextResponse.json({
      ...turn,
      runtime: adkRuntimeMode(),
    })
  }

  const user = await getSessionUser()
  if (!user || user.role !== "landlord_admin" || !user.tenantId) {
    return NextResponse.json(
      { error: "Landlord desk tools require a landlord admin session." },
      { status: 401 },
    )
  }
  if (askEasyGateReason(user.tenantId) === "upgrade") {
    return NextResponse.json({ error: "Ask Easy requires Pro or higher." }, { status: 403 })
  }

  const turn = await runAdkTurn({
    message,
    scope: "landlord",
    tenantId: user.tenantId,
    propertyId: propertyId ?? null,
  })

  return NextResponse.json({
    ...turn,
    runtime: adkRuntimeMode(),
    tenantName: user.tenantName,
  })
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    runtime: adkRuntimeMode(),
    scopes: ["public", "landlord"],
    tools: {
      public: ["search_listings"],
      landlord: [
        "search_listings",
        "property_summary",
        "unit_availability",
        "applications_summary",
      ],
    },
  })
}

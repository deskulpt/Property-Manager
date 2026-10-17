import { createDraftFromImport } from "@/lib/import/drafts"
import { resolveImportActor } from "@/lib/import/auth"
import { fetchAndParseListing } from "@/lib/import/fetch-listing"
import { listingSiteIdSchema } from "@/lib/import/listing-schema"
import { checkImportRateLimit } from "@/lib/import/rate-limit"
import { z } from "zod"

export const runtime = "nodejs"

const bodySchema = z.object({
  siteId: listingSiteIdSchema,
  url: z.string().url(),
  action: z.enum(["preview", "create"]).default("preview"),
  tenantId: z.string().optional(),
  forceFixture: z.boolean().optional(),
})

export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    )
  }

  const actor = await resolveImportActor(parsed.data.tenantId)
  if ("error" in actor) {
    return Response.json({ error: actor.error }, { status: actor.status })
  }

  const rateKey = `${actor.user.id}:${actor.tenantId}`
  const rate = checkImportRateLimit(rateKey)
  if (!rate.ok) {
    return Response.json(
      { error: "Too many import requests. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    )
  }

  try {
    const result = await fetchAndParseListing({
      siteId: parsed.data.siteId,
      url: parsed.data.url,
      forceFixture: parsed.data.forceFixture,
    })

    if (parsed.data.action === "preview") {
      return Response.json({
        ok: true,
        action: "preview",
        listing: result.listing,
        usedFixture: result.usedFixture,
        fetchNote: result.fetchNote,
        tenantId: actor.tenantId,
        disclaimer:
          "You are responsible for having rights to reuse listing content. Respect each site’s robots.txt and terms of service. This demo may use fixture HTML when a live public page cannot be fetched. Easy Rental does not bypass logins or CAPTCHAs.",
      })
    }

    const created = createDraftFromImport({
      tenantId: actor.tenantId,
      actorId: actor.user.id,
      listing: result.listing,
      usedFixture: result.usedFixture,
    })
    if (!created.ok) {
      return Response.json({ error: created.error }, { status: 500 })
    }

    return Response.json({
      ok: true,
      action: "create",
      listing: result.listing,
      usedFixture: result.usedFixture,
      fetchNote: result.fetchNote,
      draft: {
        id: created.draft.id,
        propertyId: created.draft.propertyId,
        unitId: created.draft.unitId,
      },
      tenantId: actor.tenantId,
      disclaimer:
        "Draft created for your organisation only. Confirm rights to reuse source content before publishing. Demo fixtures may have supplied the mapped fields.",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed."
    return Response.json({ error: message }, { status: 400 })
  }
}

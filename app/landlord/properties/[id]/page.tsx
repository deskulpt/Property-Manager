import Link from "next/link"
import { notFound } from "next/navigation"
import { HotspotEditor } from "@/components/floor/hotspot-editor"
import { UnitPlanCreator } from "@/components/floor/unit-plan-creator"
import { PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { submitFloorPlan } from "@/lib/actions"
import { propertyForLandlord } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Building visuals" }

export default async function FloorPlanEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const { id } = await params
  const property = propertyForLandlord(user.tenantId, id)
  if (!property) notFound()
  return (
    <div>
      <PageHeader
        kicker={property.area}
        title={property.name}
        lede="Plan creator drafts orthogonal layouts from areas, then you place walls, doors, rooms, baths, and lifts. Upload a raster plate and pin hotspots when you already have a drawing. Public applicants see the interactive floor stack."
      />

      <section className="mb-10">
        <h2 className="font-serif text-xl font-semibold">Plan creator</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Start from an empty canvas or auto-partition by sq ft / sq yd. Add floors when the first
          plate exists. Drafts save to this organisation only (tenant-scoped).
        </p>
        <div className="mt-4">
          <UnitPlanCreator
            propertyId={property.id}
            buildingName={property.name}
            floors={property.floors.map((floor) => ({
              id: floor.id,
              label: floor.label,
              levelIndex: floor.levelIndex,
              planDraftJson: floor.planDraftJson,
            }))}
          />
        </div>
      </section>

      <form action={submitFloorPlan} className="mb-6 flex flex-wrap items-end gap-3 bg-card p-4 ring-1 ring-foreground/10">
        <input type="hidden" name="propertyId" value={property.id} />
        <label className="grid gap-1 text-sm">
          Floor image upload
          <input name="floorPlan" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required className="text-sm" />
        </label>
        <SubmitButton pendingLabel="Uploading…">Upload floor plan</SubmitButton>
      </form>
      <div className="mb-6 border border-ink/10 bg-paper-2 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">QR posters</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {property.units.map((unit) => (
            <li key={unit.id}>
              <Link
                href={`/landlord/poster/${unit.id}`}
                className="font-semibold text-terra hover:underline"
              >
                Unit {unit.code} · Print QR poster
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <h2 className="mb-3 font-serif text-xl font-semibold">Hotspot pins</h2>
      <HotspotEditor
        propertyId={property.id}
        src={property.floorPlanPath}
        units={property.units.map((unit) => ({
          id: unit.id,
          code: unit.code,
          status: unit.status,
          x: unit.hotspotX,
          y: unit.hotspotY,
        }))}
      />
    </div>
  )
}

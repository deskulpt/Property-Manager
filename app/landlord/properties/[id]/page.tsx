import Link from "next/link"
import { notFound } from "next/navigation"
import { HotspotEditor } from "@/components/floor/hotspot-editor"
import { PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { submitFloorPlan } from "@/lib/actions"
import { propertyForLandlord } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Floor plan" }

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
        lede="Upload a floor image, select a bay, then click the map. Save writes percentages onto the unit. The public page uses those pins."
      />
      <form action={submitFloorPlan} className="mb-6 flex flex-wrap items-end gap-3 bg-card p-4 ring-1 ring-foreground/10">
        <input type="hidden" name="propertyId" value={property.id} />
        <label className="grid gap-1 text-sm">
          Floor image
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

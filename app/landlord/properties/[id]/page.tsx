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
          <input name="floorPlan" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" required className="text-sm" />
        </label>
        <SubmitButton pendingLabel="Uploading…">Upload floor plan</SubmitButton>
      </form>
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

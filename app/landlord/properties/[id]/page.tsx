import Link from "next/link"
import { notFound } from "next/navigation"
import { BuildingVisualsPanel } from "@/components/floor/building-visuals-panel"
import { UnitPlanCreator } from "@/components/floor/unit-plan-creator"
import { PageHeader } from "@/components/product"
import { propertyForLandlord } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Building visuals" }

export default async function BuildingVisualsPage({ params }: { params: Promise<{ id: string }> }) {
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
        lede="Plan creator drafts orthogonal layouts from areas. Building visuals cover floor-map hotspots, interactive 3D mesh binds, and Matterport walkthrough links. Public visitors open bays from pins or coloured meshes."
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

      <BuildingVisualsPanel
        propertyId={property.id}
        propertySlug={property.slug}
        floorPlanPath={property.floorPlanPath}
        modelPath={property.modelPath}
        modelKind={property.modelKind}
        units={property.units.map((unit) => ({
          id: unit.id,
          code: unit.code,
          status: unit.status,
          floorId: unit.floorId,
          x: unit.hotspotX,
          y: unit.hotspotY,
          matterportUrl: unit.matterportUrl,
          ratePsf: unit.ratePsf,
          sqft: unit.sqft,
        }))}
        bindings={property.meshBindings.map((b) => ({
          meshKey: b.meshKey,
          unitId: b.unitId,
        }))}
      />
    </div>
  )
}

import Link from "next/link"
import { notFound } from "next/navigation"
import { BuildingModelDynamic } from "@/components/floor/building-model-dynamic"
import { DraftBuildingDynamic } from "@/components/floor/draft-building-dynamic"
import { FloorPlanView } from "@/components/floor/floor-plan"
import { FloorStackViewer } from "@/components/floor/floor-stack-viewer"
import { PropertyMap } from "@/components/map/property-map"
import { PageHeader, StatusBadge } from "@/components/product"
import { getPropertyBySlug } from "@/lib/db"
import { money, monthlyRentCents, rateLabel, sqft } from "@/lib/format"
import { floorsWithDrafts } from "@/lib/floor-extrude"
import { parsePlanDraft } from "@/lib/plan-draft"

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const property = getPropertyBySlug(slug)
  if (!property) notFound()
  const markers = property.units
    .filter((unit) => unit.hotspotX != null && unit.hotspotY != null)
    .map((unit) => ({
      href: `/properties/${property.slug}/units/${unit.code}`,
      code: unit.code,
      x: unit.hotspotX as number,
      y: unit.hotspotY as number,
      status: unit.status,
      floorId: unit.floorId,
    }))
  const multiFloor = property.floors.length >= 2
  const extrudedFloors = floorsWithDrafts(property.floors, parsePlanDraft)
  const draftUnits = property.units.map((unit) => ({
    code: unit.code,
    status: unit.status,
    href: `/properties/${property.slug}/units/${unit.code}`,
    floorId: unit.floorId,
  }))

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-8">
      <PageHeader
        kicker={property.tenantName}
        title={property.name}
        lede={
          multiFloor
            ? `${property.address}. Hover a floor plate to focus it, click or hold to open the plan, click away to settle the stack. Pins on the open plate open that bay.`
            : `${property.address}. Click a pin to open that bay.`
        }
      />
      {property.visitsEnabled ? (
        <p className="mb-6">
          <Link
            href={`/properties/${property.slug}/book`}
            className="border border-ink/20 px-3 py-2 font-serif text-sm font-semibold transition-colors hover:border-terra hover:text-terra"
            data-testid="book-visit-property"
          >
            Book a visit
          </Link>
        </p>
      ) : null}
      {multiFloor ? (
        <FloorStackViewer
          floors={property.floors.map((floor) => ({
            id: floor.id,
            label: floor.label,
            levelIndex: floor.levelIndex,
            planPath: floor.planPath ?? property.floorPlanPath,
          }))}
          markers={markers}
          buildingName={property.name}
        />
      ) : (
        <FloorPlanView
          src={property.floorPlanPath}
          alt={`Floor plan of ${property.name}`}
          markers={markers}
        />
      )}
      {property.modelPath && property.modelKind ? (
        <section className="mt-10" data-testid="property-3d-section">
          <h2 className="font-serif text-xl font-semibold">3D building</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Interactive model for this property. Coloured bays are mapped to leasable units — click
            through to apply.
          </p>
          <div className="mt-4">
            <BuildingModelDynamic
              url={property.modelPath}
              kind={property.modelKind}
              bindings={property.meshBindings.flatMap((binding) => {
                const unit = property.units.find((u) => u.id === binding.unitId)
                if (!unit) return []
                return [
                  {
                    meshKey: binding.meshKey,
                    unitId: unit.id,
                    unitCode: unit.code,
                    status: unit.status,
                    ratePsf: unit.ratePsf,
                    sqft: unit.sqft,
                    href: `/properties/${property.slug}/units/${unit.code}`,
                  },
                ]
              })}
              mode="public"
            />
          </div>
        </section>
      ) : extrudedFloors.length > 0 ? (
        <section className="mt-10" data-testid="property-3d-section">
          <h2 className="font-serif text-xl font-semibold">3D building</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Extruded from published CAD/PDF floor plates — walls, units, lifts, stairs only. Select a
            floor, then a bay for Matterport / gallery unit view.
          </p>
          <div className="mt-4">
            <DraftBuildingDynamic floors={extrudedFloors} units={draftUnits} mode="public" />
          </div>
        </section>
      ) : multiFloor ? (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
          Progressive 2D stack · ingest CAD/PDF or upload a GLB/IFC on the landlord visuals desk
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
        <span>Green · available</span>
        <span>Gold · pending</span>
        <span>Stone · leased</span>
      </div>
      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold">Map</h2>
        <p className="mt-1 text-sm text-ink-soft">
          OpenStreetMap pin for this building. Directions open Google Maps (no API key).
        </p>
        <div className="mt-4">
          <PropertyMap
            latitude={property.latitude}
            longitude={property.longitude}
            address={property.address}
            label={property.name}
            entranceLatitude={property.entranceLatitude}
            entranceLongitude={property.entranceLongitude}
            entranceLabel={property.entranceLabel}
            hideExactPin={property.hideExactPin}
          />
        </div>
      </section>
      <div className="mt-8 grid gap-3">
        {property.units.map((unit) => (
          <Link
            key={unit.id}
            href={`/properties/${property.slug}/units/${unit.code}`}
            className="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3 ring-1 ring-foreground/10"
          >
            <span className="font-sans text-lg font-extrabold">Unit {unit.code}</span>
            <span className="text-sm text-ink-soft">
              {sqft(unit.sqft)} · ₹{rateLabel(unit.ratePsf)} / SF · mo ·{" "}
              {money(monthlyRentCents(unit.ratePsf, unit.sqft))} / mo
            </span>
            <StatusBadge status={unit.status} />
          </Link>
        ))}
      </div>
    </div>
  )
}

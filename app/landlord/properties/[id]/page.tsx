import Link from "next/link"
import { notFound } from "next/navigation"
import { BuildingVisualsPanel } from "@/components/floor/building-visuals-panel"
import { UnitPlanCreator } from "@/components/floor/unit-plan-creator"
import { MapPinForm } from "@/components/landlord/map-pin-form"
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
        kicker={`${property.area} · USP`}
        title={property.name}
        lede="Plan creator drafts orthogonal layouts. CAD/PDF ingest builds plates. Interactive 3D mesh binds and Matterport tours let prospects open bays from pins or coloured meshes."
        actions={
          <>
            <a href="#plan-creator" className="btn btn-primary btn-sm rounded-sm">
              Plan creator
            </a>
            <a href="#cad-ingest" className="btn btn-secondary btn-sm rounded-sm">
              CAD / PDF ingest
            </a>
            <a href="#building-3d" className="btn btn-outline btn-sm rounded-sm">
              3D viewer
            </a>
          </>
        }
      />

      <nav
        className="mb-6 flex flex-wrap gap-2 text-sm"
        aria-label="Building visualizer sections"
        data-testid="building-visualizer-jump"
      >
        <a href="#plan-creator" className="btn btn-ghost btn-xs rounded-sm">
          Plan creator
        </a>
        <a href="#cad-ingest" className="btn btn-ghost btn-xs rounded-sm">
          CAD / PDF
        </a>
        <a href="#building-3d" className="btn btn-ghost btn-xs rounded-sm">
          Floor map &amp; 3D
        </a>
        <Link href="/landlord/listings" className="btn btn-ghost btn-xs rounded-sm">
          Edit listings
        </Link>
      </nav>

      <section id="plan-creator" className="mb-10 scroll-mt-28">
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

      <div className="mb-6">
        <MapPinForm
          propertyId={property.id}
          latitude={property.latitude}
          longitude={property.longitude}
          entranceLatitude={property.entranceLatitude}
          entranceLongitude={property.entranceLongitude}
          entranceLabel={property.entranceLabel}
          hideExactPin={property.hideExactPin}
        />
      </div>
      <div className="mb-6 border border-ink/10 bg-paper-2 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">QR posters</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <li>
            <Link
              href={`/landlord/poster/property/${property.id}`}
              className="font-semibold text-terra hover:underline"
            >
              Property QR poster
            </Link>
          </li>
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
        floors={property.floors.map((floor) => ({
          id: floor.id,
          label: floor.label,
          levelIndex: floor.levelIndex,
          planDraftJson: floor.planDraftJson,
        }))}
        mapVersions={property.mapVersions.map((version) => ({
          id: version.id,
          status: version.status,
          sourceKind: version.sourceKind,
          sourceFilename: version.sourceFilename,
          platePath: version.platePath,
          createdAt: version.createdAt,
          publishedAt: version.publishedAt,
        }))}
        activeMapVersionId={property.activeMapVersionId}
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

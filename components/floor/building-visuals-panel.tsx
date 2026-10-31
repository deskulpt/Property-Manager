"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  bindMeshAction,
  submitBuildingModel,
  submitFloorPlan,
  submitUnitMatterport,
  unbindMeshAction,
} from "@/lib/actions"
import { BuildingModelDynamic } from "@/components/floor/building-model-dynamic"
import type { ViewerBinding, ViewerUnitOption } from "@/components/floor/building-model-viewer"
import { FloorIngestPanel } from "@/components/floor/floor-ingest-panel"
import { HotspotEditor } from "@/components/floor/hotspot-editor"
import { SubmitButton } from "@/components/submit-button"
import type { UnitStatus } from "@/lib/format"

type UnitRow = {
  id: string
  code: string
  status: UnitStatus
  floorId: string | null
  x: number | null
  y: number | null
  matterportUrl: string | null
  ratePsf: number
  sqft: number
}

type FloorOpt = { id: string; label: string; levelIndex: number }

type MapVersionRow = {
  id: string
  status: "draft" | "published"
  sourceKind: string
  sourceFilename: string
  platePath: string | null
  createdAt: string
  publishedAt: string | null
}

export function BuildingVisualsPanel({
  propertyId,
  propertySlug,
  floorPlanPath,
  modelPath,
  modelKind,
  units,
  bindings,
  floors = [],
  mapVersions = [],
  activeMapVersionId = null,
  tenantId = null,
}: {
  propertyId: string
  propertySlug: string
  floorPlanPath: string | null
  modelPath: string | null
  modelKind: "glb" | "gltf" | "ifc" | "obj" | null
  units: UnitRow[]
  bindings: { meshKey: string; unitId: string }[]
  floors?: FloorOpt[]
  mapVersions?: MapVersionRow[]
  activeMapVersionId?: string | null
  tenantId?: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [modelError, setModelError] = useState<string | null>(null)
  const [mpError, setMpError] = useState<string | null>(null)
  const [mpUnitId, setMpUnitId] = useState(units[0]?.id ?? "")
  const [mpUrl, setMpUrl] = useState(units[0]?.matterportUrl ?? "")

  const viewerBindings: ViewerBinding[] = bindings
    .map((b) => {
      const unit = units.find((u) => u.id === b.unitId)
      if (!unit) return null
      return {
        meshKey: b.meshKey,
        unitId: unit.id,
        unitCode: unit.code,
        status: unit.status,
        ratePsf: unit.ratePsf,
        sqft: unit.sqft,
        href: `/properties/${propertySlug}/units/${unit.code}`,
      }
    })
    .filter(Boolean) as ViewerBinding[]

  const unitOptions: ViewerUnitOption[] = units.map((u) => ({
    id: u.id,
    code: u.code,
    floorId: u.floorId,
    status: u.status,
  }))

  return (
    <div className="grid gap-8">
      <FloorIngestPanel
        propertyId={propertyId}
        tenantId={tenantId}
        floors={floors}
        versions={mapVersions}
        activeMapVersionId={activeMapVersionId}
      />

      <section className="grid gap-3" data-testid="visuals-floor-map">
        <header>
          <h2 className="font-serif text-xl font-semibold">Floor map (2D)</h2>
          <p className="mt-1 text-sm text-ink-soft">
            PNG, JPEG, WebP, GIF, or SVG · 5 MB max. Or ingest CAD/PDF above. Click the plan to place
            hotspots after upload.
          </p>
        </header>
        <form action={submitFloorPlan} className="flex flex-wrap items-end gap-3 bg-card p-4 ring-1 ring-foreground/10">
          <input type="hidden" name="propertyId" value={propertyId} />
          <label className="grid gap-1 text-sm">
            Floor image
            <input
              name="floorPlan"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              required
              className="text-sm"
            />
          </label>
          <SubmitButton pendingLabel="Uploading…">Upload floor plan</SubmitButton>
        </form>
        <HotspotEditor
          propertyId={propertyId}
          src={floorPlanPath}
          units={units.map((unit) => ({
            id: unit.id,
            code: unit.code,
            status: unit.status,
            x: unit.x,
            y: unit.y,
          }))}
        />
      </section>

      <section className="grid gap-3" data-testid="visuals-3d-model">
        <header>
          <h2 className="font-serif text-xl font-semibold">3D model (glTF / GLB / IFC / OBJ)</h2>
          <p className="mt-1 text-sm text-ink-soft">
            GLB/OBJ ≤25 MB · IFC ≤50 MB. Type is sniffed from file contents. Replacing a model clears prior mesh
            bindings.
          </p>
        </header>
        <form
          className="flex flex-wrap items-end gap-3 bg-card p-4 ring-1 ring-foreground/10"
          onSubmit={(event) => {
            event.preventDefault()
            const form = event.currentTarget
            const data = new FormData(form)
            setModelError(null)
            startTransition(async () => {
              const result = await submitBuildingModel(data)
              if (!result.ok) {
                setModelError(result.error)
                return
              }
              router.refresh()
            })
          }}
        >
          <input type="hidden" name="propertyId" value={propertyId} />
          <label className="grid gap-1 text-sm">
            Building model
            <input
              name="buildingModel"
              type="file"
              accept=".glb,.gltf,.ifc,.obj,model/gltf-binary,model/gltf+json"
              required
              className="text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="bg-brand px-3 py-2 text-sm font-bold text-paper disabled:opacity-50"
          >
            {pending ? "Uploading…" : "Upload 3D model"}
          </button>
        </form>
        {modelError ? (
          <p className="text-sm text-red-800" role="alert" data-testid="model-upload-error">
            {modelError}
          </p>
        ) : null}
        {modelPath && modelKind ? (
          <BuildingModelDynamic
            url={modelPath}
            kind={modelKind}
            bindings={viewerBindings}
            mode="edit"
            units={unitOptions}
            onBind={(meshKey, unitId) => {
              startTransition(async () => {
                await bindMeshAction({
                  propertyId,
                  unitId,
                  meshKey,
                  meshKind:
                    modelKind === "ifc"
                      ? "ifc_express_id"
                      : modelKind === "obj"
                        ? "obj_name"
                        : "gltf_name",
                })
                router.refresh()
              })
            }}
            onUnbind={(meshKey) => {
              startTransition(async () => {
                await unbindMeshAction({ propertyId, meshKey })
                router.refresh()
              })
            }}
          />
        ) : (
          <p className="border border-dashed border-border bg-card/50 p-6 text-sm text-ink-soft">
            No 3D model yet. Upload a GLB seed (Kenney-style) or IFC Duplex sample to map bays.
          </p>
        )}
      </section>

      <section className="grid gap-3" data-testid="visuals-matterport">
        <header>
          <h2 className="font-serif text-xl font-semibold">Matterport link</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Iframe show URL only — <span className="font-mono text-xs">https://my.matterport.com/show/?m=…</span>.
            Discover links are normalised on save. No SDK, no asset download.
          </p>
        </header>
        <form
          className="grid gap-3 bg-card p-4 ring-1 ring-foreground/10 md:grid-cols-[10rem_1fr_auto] md:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            setMpError(null)
            startTransition(async () => {
              const result = await submitUnitMatterport({ unitId: mpUnitId, url: mpUrl })
              if (!result.ok) {
                setMpError(result.error)
                return
              }
              router.refresh()
            })
          }}
        >
          <label className="grid gap-1 text-sm">
            Unit
            <select
              className="border border-border bg-paper px-2 py-1.5"
              value={mpUnitId}
              onChange={(e) => {
                const id = e.target.value
                setMpUnitId(id)
                setMpUrl(units.find((u) => u.id === id)?.matterportUrl ?? "")
              }}
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Show URL
            <input
              className="border border-border bg-paper px-2 py-1.5 font-mono text-xs"
              value={mpUrl}
              onChange={(e) => setMpUrl(e.target.value)}
              placeholder="https://my.matterport.com/show/?m=…"
            />
          </label>
          <button type="submit" disabled={pending} className="bg-brand px-3 py-2 text-sm font-bold text-paper">
            Save walkthrough
          </button>
        </form>
        {mpError ? (
          <p className="text-sm text-red-800" role="alert">
            {mpError}
          </p>
        ) : null}
      </section>
    </div>
  )
}

"use client"

import Link from "next/link"
import { Canvas } from "@react-three/fiber"
import { ContactShadows, OrbitControls } from "@react-three/drei"
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import * as THREE from "three"
import {
  buildExtrudeMeshes,
  FLOOR_HEIGHT,
  statusTint,
  type ExtrudeFloorLevel,
  type ExtrudeMesh,
} from "@/lib/floor-extrude"
import type { UnitStatus } from "@/lib/format"

export type DraftViewerUnit = {
  code: string
  status: UnitStatus
  href: string
  floorId: string | null
}

function MeshBody({
  mesh,
  selectedFloorId,
  selectedUnitCode,
  onPickFloor,
  onPickUnit,
}: {
  mesh: ExtrudeMesh
  selectedFloorId: string | null
  selectedUnitCode: string | null
  onPickFloor: (floorId: string) => void
  onPickUnit: (code: string, href?: string) => void
}) {
  const faded =
    selectedFloorId != null && mesh.floorId !== selectedFloorId
      ? 0.22
      : mesh.kind === "unit" && selectedUnitCode && mesh.unitCode !== selectedUnitCode
        ? 0.45
        : 1

  let color = "#9bb4c7"
  if (mesh.kind === "slab") color = "#1a2f44"
  else if (mesh.kind === "wall") color = "#cfe7f2"
  else if (mesh.kind === "unit") color = statusTint(mesh.status)
  else if (mesh.kind === "lift") color = "#8f6f1f"
  else if (mesh.kind === "stairs") color = "#1f6b4a"
  else if (mesh.kind === "corridor") color = "#2a4a5e"

  const highlighted =
    (mesh.kind === "unit" && mesh.unitCode && mesh.unitCode === selectedUnitCode) ||
    (selectedFloorId === mesh.floorId && mesh.kind === "slab")

  return (
    <mesh
      position={mesh.position}
      rotation={mesh.kind === "wall" ? [0, mesh.rotationY, 0] : [0, 0, 0]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation()
        onPickFloor(mesh.floorId)
        if (mesh.kind === "unit" && mesh.unitCode) onPickUnit(mesh.unitCode, mesh.href)
      }}
      userData={{
        meshId: mesh.id,
        floorId: mesh.floorId,
        unitCode: mesh.kind === "unit" ? mesh.unitCode : undefined,
      }}
    >
      <boxGeometry args={mesh.size} />
      <meshStandardMaterial
        color={color}
        transparent={faded < 1}
        opacity={faded}
        emissive={highlighted ? new THREE.Color("#0e6e8c") : new THREE.Color("#000000")}
        emissiveIntensity={highlighted ? 0.35 : 0}
        roughness={0.55}
        metalness={0.08}
      />
    </mesh>
  )
}

function DraftScene({
  floors,
  units,
  selectedFloorId,
  selectedUnitCode,
  onPickFloor,
  onPickUnit,
}: {
  floors: ExtrudeFloorLevel[]
  units: DraftViewerUnit[]
  selectedFloorId: string | null
  selectedUnitCode: string | null
  onPickFloor: (id: string) => void
  onPickUnit: (code: string, href?: string) => void
}) {
  const meshes = useMemo(() => {
    const status = new Map(units.map((u) => [u.code, u.status]))
    const hrefs = new Map(units.map((u) => [u.code, u.href]))
    return buildExtrudeMeshes(floors, {
      unitStatusByCode: status,
      unitHrefByCode: hrefs,
    })
  }, [floors, units])

  const maxLevel = Math.max(0, ...floors.map((f) => f.levelIndex))
  const camY = Math.max(12, (maxLevel + 1) * FLOOR_HEIGHT * 0.9)

  return (
    <>
      <color attach="background" args={["#0a1624"]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        castShadow
        position={[18, camY + 8, 12]}
        intensity={1.1}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <group>
        {meshes.map((mesh) => (
          <MeshBody
            key={mesh.id}
            mesh={mesh}
            selectedFloorId={selectedFloorId}
            selectedUnitCode={selectedUnitCode}
            onPickFloor={onPickFloor}
            onPickUnit={onPickUnit}
          />
        ))}
      </group>
      <ContactShadows position={[0, -0.01, 0]} opacity={0.45} scale={60} blur={2.5} />
      <OrbitControls
        makeDefault
        enablePan
        minDistance={8}
        maxDistance={90}
        maxPolarAngle={Math.PI * 0.49}
        target={[0, (maxLevel * FLOOR_HEIGHT) / 2, 0]}
      />
    </>
  )
}

function ViewerShell({
  children,
  loading,
}: {
  children: ReactNode
  loading?: boolean
}) {
  return (
    <div
      className="relative h-[min(70vh,520px)] w-full overflow-hidden border border-border bg-brand-deep"
      data-testid="draft-building-viewer"
      data-loading={loading ? "true" : "false"}
    >
      {children}
    </div>
  )
}

export function DraftBuildingViewer({
  floors,
  units,
  mode = "public",
}: {
  floors: ExtrudeFloorLevel[]
  units: DraftViewerUnit[]
  mode?: "public" | "edit"
}) {
  const ordered = useMemo(
    () => [...floors].sort((a, b) => a.levelIndex - b.levelIndex),
    [floors],
  )
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(
    ordered[0]?.id ?? null,
  )
  const [selectedUnitCode, setSelectedUnitCode] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Defer Canvas until after mount; clear on unmount to avoid R3F removeChild races.
    const id = window.requestAnimationFrame(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(id)
      setReady(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedFloorId && ordered[0]) setSelectedFloorId(ordered[0].id)
  }, [ordered, selectedFloorId])

  if (ordered.length === 0) {
    return (
      <div
        className="border border-dashed border-border bg-card/60 p-6 text-sm text-ink-soft"
        data-testid="draft-building-empty"
        role="status"
      >
        No published floor drafts yet. Ingest a PDF/DXF, edit the plate, then publish to extrude a
        stacked 3D building.
      </div>
    )
  }

  const selectedUnit = units.find((u) => u.code === selectedUnitCode)
  const floorUnits = units.filter(
    (u) => !selectedFloorId || u.floorId == null || u.floorId === selectedFloorId,
  )

  return (
    <div className="grid gap-3">
      <div
        className="flex flex-wrap items-center gap-2"
        data-testid="draft-building-floor-select"
        role="toolbar"
        aria-label="Floor select"
      >
        {ordered.map((floor) => {
          const active = floor.id === selectedFloorId
          return (
            <button
              key={floor.id}
              type="button"
              className={`btn btn-sm min-h-9 rounded-md px-3 text-sm font-semibold transition-colors ${
                active
                  ? "btn-primary bg-[#0e6e8c] text-paper"
                  : "btn-ghost border border-ink/15 bg-paper text-ink hover:border-[#0e6e8c]"
              }`}
              aria-pressed={active}
              data-testid={`draft-floor-chip-${floor.levelIndex}`}
              onClick={() => {
                setSelectedFloorId(floor.id)
                setSelectedUnitCode(null)
              }}
            >
              {floor.label}
            </button>
          )
        })}
      </div>

      <ViewerShell loading={!ready}>
        {!ready ? (
          <div
            className="flex h-full items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider text-paper"
            data-testid="draft-building-loading"
          >
            <span className="loading loading-spinner loading-md inline-block h-5 w-5 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
            Extruding floor plates…
          </div>
        ) : (
          <Canvas
            shadows={{ type: THREE.PCFShadowMap }}
            camera={{ position: [28, 22, 28], fov: 42, near: 0.1, far: 200 }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            onPointerMissed={() => setSelectedUnitCode(null)}
          >
            <Suspense fallback={null}>
              <DraftScene
                floors={ordered}
                units={units}
                selectedFloorId={selectedFloorId}
                selectedUnitCode={selectedUnitCode}
                onPickFloor={setSelectedFloorId}
                onPickUnit={(code) => setSelectedUnitCode(code)}
              />
            </Suspense>
          </Canvas>
        )}
      </ViewerShell>

      <div
        className="flex flex-wrap items-center justify-between gap-3 bg-card px-3 py-2 text-sm ring-1 ring-foreground/10"
        data-testid="draft-building-unit-panel"
      >
        {selectedUnit ? (
          <>
            <p>
              Unit <strong>{selectedUnit.code}</strong>
              <span className="text-ink-soft"> · {selectedUnit.status}</span>
              {mode === "edit" ? (
                <span className="ml-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  draft extrude
                </span>
              ) : null}
            </p>
            <Link
              href={selectedUnit.href}
              className="btn btn-primary bg-[#0e6e8c] px-3 py-1.5 text-sm font-bold text-paper"
              data-testid="draft-building-open-unit"
            >
              Open unit view
            </Link>
          </>
        ) : (
          <p className="text-ink-soft" data-testid="draft-building-unit-hint">
            Select a floor, then click a bay for Matterport / gallery unit view
            {floorUnits.length ? ` · ${floorUnits.length} units on focus` : ""}.
          </p>
        )}
      </div>
    </div>
  )
}

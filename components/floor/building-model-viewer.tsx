"use client"

import Link from "next/link"
import { Canvas } from "@react-three/fiber"
import { Bounds, ContactShadows, Html, OrbitControls, useGLTF } from "@react-three/drei"
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import * as THREE from "three"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { useLoader } from "@react-three/fiber"
import type { UnitStatus } from "@/lib/format"
import { money, monthlyRentCents } from "@/lib/format"

export type ViewerBinding = {
  meshKey: string
  unitId: string
  unitCode: string
  status: UnitStatus
  ratePsf: number
  sqft: number
  href: string
}

export type ViewerUnitOption = {
  id: string
  code: string
  floorId: string | null
  status: UnitStatus
}

type ModelKind = "glb" | "gltf" | "ifc" | "obj"

const statusTint: Record<UnitStatus, string> = {
  available: "#1f6b4a",
  pending: "#8f6f1f",
  leased: "#5a6570",
}

function meshName(object: THREE.Object3D): string {
  return object.name?.trim() || object.uuid
}

function GlbScene({
  url,
  bindings,
  selectedMesh,
  onPick,
  mode,
}: {
  url: string
  bindings: ViewerBinding[]
  selectedMesh: string | null
  onPick: (key: string) => void
  mode: "public" | "edit"
}) {
  const gltf = useGLTF(url)
  const byKey = useMemo(() => new Map(bindings.map((b) => [b.meshKey, b])), [bindings])

  useEffect(() => {
    gltf.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      const key = meshName(mesh)
      const bound = byKey.get(key)
      const mat = mesh.material
      if (mat && !Array.isArray(mat) && "color" in mat) {
        const base = (mat as THREE.MeshStandardMaterial).clone()
        if (bound) base.color = new THREE.Color(statusTint[bound.status])
        if (selectedMesh === key) {
          base.emissive = new THREE.Color("#0e6e8c")
          base.emissiveIntensity = 0.35
        } else {
          base.emissive = new THREE.Color("#000000")
          base.emissiveIntensity = 0
        }
        mesh.material = base
      }
      mesh.userData.meshKey = key
      mesh.userData.bound = bound ?? null
    })
  }, [gltf.scene, byKey, selectedMesh])

  return (
    <primitive
      object={gltf.scene}
      onClick={(event: { stopPropagation: () => void; object: THREE.Object3D }) => {
        event.stopPropagation()
        let obj: THREE.Object3D | null = event.object
        while (obj) {
          const key = meshName(obj)
          if (key && key !== "Scene" && key !== "BBM_Bhiwandi_Shell") {
            onPick(key)
            return
          }
          obj = obj.parent
        }
      }}
      onPointerMissed={() => {
        if (mode === "edit") onPick("")
      }}
    />
  )
}

function ObjScene({
  url,
  bindings,
  selectedMesh,
  onPick,
}: {
  url: string
  bindings: ViewerBinding[]
  selectedMesh: string | null
  onPick: (key: string) => void
}) {
  const object = useLoader(OBJLoader, url)
  const byKey = useMemo(() => new Map(bindings.map((b) => [b.meshKey, b])), [bindings])

  useEffect(() => {
    object.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const key = meshName(mesh)
      const bound = byKey.get(key)
      mesh.material = new THREE.MeshStandardMaterial({
        color: bound ? statusTint[bound.status] : "#8a9aab",
        roughness: 0.75,
        metalness: 0.05,
        emissive: selectedMesh === key ? new THREE.Color("#0e6e8c") : new THREE.Color("#000000"),
        emissiveIntensity: selectedMesh === key ? 0.35 : 0,
      })
    })
  }, [object, byKey, selectedMesh])

  return (
    <primitive
      object={object}
      onClick={(event: { stopPropagation: () => void; object: THREE.Object3D }) => {
        event.stopPropagation()
        onPick(meshName(event.object))
      }}
    />
  )
}

function IfcPlaceholder({ url }: { url: string }) {
  return (
    <Html center>
      <div className="max-w-xs border border-border bg-card p-4 text-sm text-ink shadow">
        <p className="font-sans font-semibold">IFC on file</p>
        <p className="mt-2 text-ink-soft">
          This building has an IFC model at <span className="font-mono text-xs">{url}</span>.
          Geometry loads via web-ifc in supported browsers; map spaces after the parse finishes.
        </p>
      </div>
    </Html>
  )
}

function IfcScene({
  url,
  onReady,
}: {
  url: string
  onReady: (meshes: { key: string; object: THREE.Object3D }[]) => void
}) {
  const [root, setRoot] = useState<THREE.Group | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const WebIFC = await import("web-ifc")
        const ifc = new WebIFC.IfcAPI()
        // Prefer same-origin WASM from the package when available.
        ifc.SetWasmPath("/wasm/", true)
        await ifc.Init()
        const buffer = await fetch(url).then((r) => r.arrayBuffer())
        const modelId = ifc.OpenModel(new Uint8Array(buffer))
        const group = new THREE.Group()
        group.name = "ifc-root"
        const meshes: { key: string; object: THREE.Object3D }[] = []

        // Stream geometry — web-ifc (MPL-2.0) only; no AGPL xeokit.
        ifc.StreamAllMeshes(modelId, (mesh) => {
          for (let g = 0; g < mesh.geometries.size(); g++) {
            const placed = mesh.geometries.get(g)
            const geom = ifc.GetGeometry(modelId, placed.geometryExpressID)
            const verts = ifc.GetVertexArray(geom.GetVertexData(), geom.GetVertexDataSize())
            const indices = ifc.GetIndexArray(geom.GetIndexData(), geom.GetIndexDataSize())
            const geometry = new THREE.BufferGeometry()
            const positions = new Float32Array(verts.length / 2)
            for (let v = 0, p = 0; v < verts.length; v += 6, p += 3) {
              positions[p] = verts[v]
              positions[p + 1] = verts[v + 1]
              positions[p + 2] = verts[v + 2]
            }
            geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
            geometry.setIndex(Array.from(indices))
            geometry.computeVertexNormals()
            const threeMesh = new THREE.Mesh(
              geometry,
              new THREE.MeshStandardMaterial({
                color: new THREE.Color(placed.color.x, placed.color.y, placed.color.z),
                opacity: placed.color.w,
                transparent: placed.color.w < 0.99,
                roughness: 0.85,
                metalness: 0.05,
              }),
            )
            const expressId = String(mesh.expressID)
            threeMesh.name = expressId
            if (placed.flatTransformation?.length === 16) {
              threeMesh.applyMatrix4(new THREE.Matrix4().fromArray(placed.flatTransformation))
            }
            group.add(threeMesh)
            meshes.push({ key: expressId, object: threeMesh })
            geom.delete()
          }
        })

        if (cancelled) return
        setRoot(group)
        onReady(meshes)
        ifc.CloseModel(modelId)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "IFC failed to load")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [url, onReady])

  if (error) {
    return (
      <Html center>
        <div className="max-w-sm border border-border bg-card p-4 text-sm">
          <p className="font-semibold">Could not parse IFC</p>
          <p className="mt-1 text-ink-soft">{error}</p>
          <IfcPlaceholder url={url} />
        </div>
      </Html>
    )
  }
  if (!root) {
    return (
      <Html center>
        <p className="font-mono text-xs uppercase tracking-wider text-paper">Loading IFC…</p>
      </Html>
    )
  }
  return <primitive object={root} />
}

function HoverCard({ binding }: { binding: ViewerBinding }) {
  return (
    <div className="pointer-events-none border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="font-sans font-extrabold">Unit {binding.unitCode}</p>
      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
        {binding.status} · {money(monthlyRentCents(binding.ratePsf, binding.sqft))} / mo
      </p>
    </div>
  )
}

function ViewerShell({
  children,
  caption,
}: {
  children: ReactNode
  caption: string
}) {
  return (
    <div className="relative border border-border bg-brand-deep" data-testid="building-model-viewer">
      <div className="h-[420px] w-full">
        <Canvas camera={{ position: [18, 14, 22], fov: 40 }} shadows>
          <color attach="background" args={["#13253a"]} />
          <ambientLight intensity={0.55} />
          <directionalLight castShadow position={[12, 18, 8]} intensity={1.1} />
          <Suspense
            fallback={
              <Html center>
                <p className="font-mono text-xs uppercase tracking-wider text-paper">Loading model…</p>
              </Html>
            }
          >
            <Bounds fit clip observe margin={1.2}>
              {children}
            </Bounds>
            <ContactShadows opacity={0.35} scale={40} blur={2.5} far={20} />
          </Suspense>
          <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.49} />
        </Canvas>
      </div>
      <p className="border-t border-paper/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-paper/80">
        {caption}
      </p>
    </div>
  )
}

export function BuildingModelViewer({
  url,
  kind,
  bindings,
  mode = "public",
  units = [],
  selectedUnitId = null,
  onBind,
  onUnbind,
}: {
  url: string
  kind: ModelKind
  bindings: ViewerBinding[]
  mode?: "public" | "edit"
  units?: ViewerUnitOption[]
  selectedUnitId?: string | null
  onBind?: (meshKey: string, unitId: string) => void
  onUnbind?: (meshKey: string) => void
}) {
  const [selectedMesh, setSelectedMesh] = useState<string | null>(null)
  const [hover, setHover] = useState<ViewerBinding | null>(null)
  const [unitId, setUnitId] = useState(selectedUnitId ?? units[0]?.id ?? "")
  const [message, setMessage] = useState<string | null>(null)

  const bindingForSelected = bindings.find((b) => b.meshKey === selectedMesh) ?? null

  const onPick = useCallback(
    (key: string) => {
      if (!key) {
        setSelectedMesh(null)
        setHover(null)
        return
      }
      setSelectedMesh(key)
      const bound = bindings.find((b) => b.meshKey === key) ?? null
      setHover(bound)
      if (mode === "public" && bound) {
        // Navigation handled by the CTA below / click-through link.
      }
    },
    [bindings, mode],
  )

  const scene =
    kind === "glb" || kind === "gltf" ? (
      <GlbScene url={url} bindings={bindings} selectedMesh={selectedMesh} onPick={onPick} mode={mode} />
    ) : kind === "obj" ? (
      <ObjScene url={url} bindings={bindings} selectedMesh={selectedMesh} onPick={onPick} />
    ) : (
      <IfcScene url={url} onReady={() => undefined} />
    )

  return (
    <div className="grid gap-3">
      <ViewerShell
        caption={
          mode === "edit"
            ? "Landlord mapping · pick a unit, click a mesh, then Bind"
            : "Click a coloured bay · hover shows code, status, and rent"
        }
      >
        {scene}
      </ViewerShell>

      {hover ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <HoverCard binding={hover} />
          <Link
            href={hover.href}
            className="bg-brand px-4 py-2 font-sans text-sm font-bold text-paper"
            data-testid="model-unit-cta"
          >
            Open unit {hover.unitCode}
          </Link>
        </div>
      ) : selectedMesh && mode === "public" ? (
        <p className="text-sm text-ink-soft">Not linked to a unit</p>
      ) : null}

      {mode === "edit" ? (
        <div className="grid gap-3 bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
            Selected mesh · {selectedMesh || "none"}
            {bindingForSelected ? ` · linked to ${bindingForSelected.unitCode}` : ""}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              Unit
              <select
                className="min-w-[8rem] border border-border bg-paper px-2 py-1.5"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.code}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="bg-brand px-3 py-2 text-sm font-bold text-paper disabled:opacity-40"
              disabled={!selectedMesh || !unitId}
              onClick={() => {
                if (!selectedMesh || !unitId || !onBind) return
                onBind(selectedMesh, unitId)
                setMessage(`Bound mesh ${selectedMesh}`)
              }}
            >
              Bind mesh → unit
            </button>
            <button
              type="button"
              className="border border-border px-3 py-2 text-sm disabled:opacity-40"
              disabled={!selectedMesh || !onUnbind}
              onClick={() => {
                if (!selectedMesh || !onUnbind) return
                onUnbind(selectedMesh)
                setMessage(`Cleared ${selectedMesh}`)
              }}
            >
              Unbind
            </button>
          </div>
          {message ? <p className="text-sm text-ink-soft">{message}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

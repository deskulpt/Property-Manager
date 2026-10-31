"use client"

import gsap from "gsap"
import {
  Bath,
  DoorOpen,
  Layers,
  Plus,
  Square,
  Trash2,
  Wand2,
  Zap,
} from "lucide-react"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { useRouter } from "next/navigation"
import { addFloorLevelAction, savePlanDraftAction } from "@/lib/actions"
import {
  autoPartitionLayout,
  emptyPlanDraft,
  parsePlanDraft,
  sanitizePlanLabel,
  snapPct,
  sqftToSqyd,
  sqydToSqft,
  type PlanAreaUnit,
  type PlanDraft,
  type PlanElement,
} from "@/lib/plan-draft"
import { ensureBrowserRust } from "@/lib/rust/load.browser"
import "./unit-plan-creator.css"

type Tool = "select" | "wall" | "door" | "room" | "bathroom" | "lift" | "unit"

type FloorOpt = {
  id: string
  label: string
  levelIndex: number
  planDraftJson: string | null
}

const TOOLS: { id: Tool; label: string; icon: typeof Square }[] = [
  { id: "select", label: "Select", icon: Square },
  { id: "wall", label: "Wall", icon: Layers },
  { id: "door", label: "Door", icon: DoorOpen },
  { id: "room", label: "Room", icon: Square },
  { id: "bathroom", label: "Bath", icon: Bath },
  { id: "lift", label: "Lift", icon: Zap },
  { id: "unit", label: "Unit", icon: Square },
]

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

function pctFromEvent(el: Element, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect()
  const x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 100
  const y = ((clientY - rect.top) / Math.max(rect.height, 1)) * 100
  return { x: snapPct(x), y: snapPct(y) }
}

export function UnitPlanCreator({
  propertyId,
  floors,
  buildingName,
}: {
  propertyId: string
  floors: FloorOpt[]
  buildingName: string
}) {
  const router = useRouter()
  const ordered = useMemo(
    () => [...floors].sort((a, b) => a.levelIndex - b.levelIndex),
    [floors],
  )
  const [floorId, setFloorId] = useState(ordered[0]?.id ?? "")
  const activeFloor = ordered.find((f) => f.id === floorId) ?? ordered[0]
  const initialParsed = parsePlanDraft(ordered[0]?.planDraftJson)
  const [draft, setDraft] = useState<PlanDraft>(() => initialParsed ?? emptyPlanDraft())
  const [tool, setTool] = useState<Tool>("select")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null)
  const [areaUnit, setAreaUnit] = useState<PlanAreaUnit>(initialParsed?.unit ?? "sqft")
  const [totalArea, setTotalArea] = useState(initialParsed?.totalArea ?? 10000)
  const [partitions, setPartitions] = useState([
    { code: "1", sqft: 2500 },
    { code: "2", sqft: 2500 },
    { code: "3", sqft: 2000 },
  ])
  const [seed, setSeed] = useState(initialParsed?.seed ?? 1)
  const [newFloorLabel, setNewFloorLabel] = useState("")
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  const canvasRef = useRef<SVGSVGElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void ensureBrowserRust()
  }, [])

  function loadFloor(id: string) {
    const floor = ordered.find((f) => f.id === id)
    setFloorId(id)
    setSelectedId(null)
    setWallStart(null)
    const parsed = parsePlanDraft(floor?.planDraftJson)
    setDraft(parsed ?? emptyPlanDraft())
    if (parsed) {
      setAreaUnit(parsed.unit)
      setTotalArea(parsed.totalArea)
      if (parsed.seed != null) setSeed(parsed.seed)
    }
  }

  function flashPlacement() {
    const node = flashRef.current
    if (!node) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        node,
        { autoAlpha: 0.45, scale: 1.02 },
        {
          autoAlpha: 0,
          scale: 1,
          duration: 0.48,
          ease: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      )
    }, node)
    window.setTimeout(() => ctx.revert(), 520)
  }

  function addRectElement(kind: "room" | "bathroom" | "lift" | "unit", x: number, y: number) {
    const size = kind === "lift" ? 10 : kind === "bathroom" ? 12 : 18
    const el: PlanElement = {
      id: newId(`el_${kind}`),
      kind,
      x: snapPct(Math.min(100 - size, x - size / 2)),
      y: snapPct(Math.min(100 - size, y - size / 2)),
      w: size,
      h: size,
      label:
        kind === "unit"
          ? `Unit ${draft.elements.filter((e) => e.kind === "unit").length + 1}`
          : kind === "bathroom"
            ? "Bath"
            : kind === "lift"
              ? "Lift"
              : "Room",
      unitCode: kind === "unit" ? `U${draft.elements.filter((e) => e.kind === "unit").length + 1}` : undefined,
    }
    setDraft((d) => ({
      ...d,
      elements: [...d.elements, el],
      updatedAt: new Date().toISOString(),
    }))
    setSelectedId(el.id)
    flashPlacement()
  }

  function onCanvasPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = canvasRef.current
    if (!svg || tool === "select") {
      setSelectedId(null)
      return
    }
    const { x, y } = pctFromEvent(svg, event.clientX, event.clientY)
    if (tool === "wall") {
      if (!wallStart) {
        setWallStart({ x, y })
        return
      }
      const el: PlanElement = {
        id: newId("el_wall"),
        kind: "wall",
        x1: wallStart.x,
        y1: wallStart.y,
        x2: x,
        y2: y,
      }
      setDraft((d) => ({
        ...d,
        elements: [...d.elements, el],
        updatedAt: new Date().toISOString(),
      }))
      setWallStart(null)
      flashPlacement()
      return
    }
    if (tool === "door") {
      const el: PlanElement = {
        id: newId("el_door"),
        kind: "door",
        x: snapPct(x - 2),
        y: snapPct(y - 1),
        w: 4,
        rotation: 0,
      }
      setDraft((d) => ({
        ...d,
        elements: [...d.elements, el],
        updatedAt: new Date().toISOString(),
      }))
      flashPlacement()
      return
    }
    addRectElement(tool, x, y)
  }

  async function runAutoDesign(randomize: boolean) {
    await ensureBrowserRust()
    const nextSeed = randomize ? Math.floor(Math.random() * 10000) : seed
    if (randomize) setSeed(nextSeed)
    const areaInUnit = Math.max(1, Number(totalArea) || 1)
    const parts = partitions
      .map((p) => ({
        code: sanitizePlanLabel(p.code),
        sqft: Math.max(1, Number(p.sqft) || 1),
      }))
      .filter((p) => p.code && p.sqft > 0)
    if (!parts.length) {
      setMessage("Add at least one unit partition with area.")
      return
    }
    const sum = parts.reduce((a, p) => a + p.sqft, 0)
    if (sum > areaInUnit) {
      setMessage("Unit areas exceed total floor area.")
      return
    }
    const next = autoPartitionLayout({
      totalArea: areaInUnit,
      partitions: parts,
      seed: nextSeed,
      unit: areaUnit,
    })
    setDraft(next)
    setSelectedId(null)
    setMessage(`Auto-design · seed ${nextSeed}`)
    flashPlacement()
  }

  function deleteSelected() {
    if (!selectedId) return
    setDraft((d) => ({
      ...d,
      elements: d.elements.filter((e) => e.id !== selectedId),
      updatedAt: new Date().toISOString(),
    }))
    setSelectedId(null)
  }

  function clearCanvas() {
    setDraft(emptyPlanDraft(totalArea, areaUnit))
    setSelectedId(null)
    setWallStart(null)
    setMessage("Canvas cleared")
  }

  function saveDraft() {
    if (!activeFloor) {
      setMessage("Add a floor first.")
      return
    }
    startTransition(async () => {
      const result = await savePlanDraftAction({
        propertyId,
        floorId: activeFloor.id,
        draftJson: JSON.stringify({
          ...draft,
          unit: areaUnit,
          totalArea: Math.max(1, Number(totalArea) || 1),
          updatedAt: new Date().toISOString(),
        }),
      })
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      setMessage("Draft saved")
      router.refresh()
    })
  }

  function addFloor() {
    const label = sanitizePlanLabel(newFloorLabel || `L${ordered.length}`)
    startTransition(async () => {
      const result = await addFloorLevelAction({ propertyId, label })
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      setMessage(`Added ${result.label}`)
      setNewFloorLabel("")
      loadFloor(result.floorId)
      router.refresh()
    })
  }

  function toggleAreaUnit(next: PlanAreaUnit) {
    if (next === areaUnit) return
    setTotalArea((prev) =>
      next === "sqyd" ? Math.round(sqftToSqyd(prev) * 10) / 10 : Math.round(sqydToSqft(prev)),
    )
    setPartitions((rows) =>
      rows.map((row) => ({
        ...row,
        sqft:
          next === "sqyd"
            ? Math.round(sqftToSqyd(row.sqft) * 10) / 10
            : Math.round(sqydToSqft(row.sqft)),
      })),
    )
    setAreaUnit(next)
  }

  return (
    <div className="unit-plan-creator">
      <div className="upc-toolbar" role="toolbar" aria-label="Plan creator tools">
        {TOOLS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className="upc-tool"
              data-active={tool === item.id ? "true" : "false"}
              onClick={() => {
                setTool(item.id)
                setWallStart(null)
              }}
            >
              <Icon size={14} strokeWidth={1.75} aria-hidden />
              {item.label}
            </button>
          )
        })}
        <button type="button" className="upc-tool" onClick={deleteSelected} disabled={!selectedId}>
          <Trash2 size={14} strokeWidth={1.75} aria-hidden />
          Delete
        </button>
        <button type="button" className="upc-tool" onClick={clearCanvas}>
          Clear
        </button>
        <button type="button" className="upc-tool" onClick={saveDraft} disabled={pending || !activeFloor}>
          Save draft
        </button>
      </div>

      <div className="upc-body">
        <div className="upc-canvas-wrap">
          <div
            ref={flashRef}
            className="pointer-events-none absolute inset-0 z-10 bg-cyan-400/20 opacity-0"
            aria-hidden
          />
          <svg
            ref={canvasRef}
            className="upc-canvas"
            data-empty={draft.elements.length === 0 ? "true" : "false"}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Unit plan canvas for ${buildingName}`}
            onPointerDown={onCanvasPointerDown}
          >
            {draft.elements.map((el) => {
              if (el.kind === "wall") {
                return (
                  <line
                    key={el.id}
                    x1={el.x1}
                    y1={el.y1}
                    x2={el.x2}
                    y2={el.y2}
                    stroke="var(--upc-wall)"
                    strokeWidth={0.6}
                    vectorEffect="non-scaling-stroke"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedId(el.id)
                      setTool("select")
                    }}
                  />
                )
              }
              if (el.kind === "door") {
                return (
                  <rect
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    width={el.w}
                    height={1.5}
                    fill="var(--upc-door)"
                    stroke={selectedId === el.id ? "var(--upc-cyan)" : "transparent"}
                    strokeWidth={0.4}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedId(el.id)
                      setTool("select")
                    }}
                  />
                )
              }
              const fill =
                el.kind === "unit"
                  ? "var(--upc-unit)"
                  : el.kind === "corridor"
                    ? "var(--upc-corridor)"
                    : el.kind === "bathroom"
                      ? "var(--upc-bath)"
                      : el.kind === "lift"
                        ? "var(--upc-lift)"
                        : "var(--upc-room)"
              return (
                <g
                  key={el.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedId(el.id)
                    setTool("select")
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={el.x}
                    y={el.y}
                    width={el.w}
                    height={el.h}
                    fill={fill}
                    fillOpacity={0.85}
                    stroke={selectedId === el.id ? "var(--upc-cyan)" : "var(--upc-border)"}
                    strokeWidth={selectedId === el.id ? 0.7 : 0.35}
                  />
                  <text
                    x={el.x + el.w / 2}
                    y={el.y + el.h / 2}
                    fill="var(--upc-ink)"
                    fontSize={3.2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ pointerEvents: "none", fontFamily: "ui-monospace, monospace" }}
                  >
                    {el.label}
                  </text>
                </g>
              )
            })}
            {wallStart ? (
              <circle cx={wallStart.x} cy={wallStart.y} r={1.2} fill="var(--upc-cyan)" />
            ) : null}
          </svg>
        </div>

        <aside className="upc-side">
          <div>
            <h3>Floors</h3>
            <div className="upc-floors mt-2">
              {ordered.length === 0 ? (
                <p className="text-sm text-[var(--upc-ink-soft)]">No floors yet — add Ground to start.</p>
              ) : (
                ordered.map((floor) => (
                  <button
                    key={floor.id}
                    type="button"
                    className="upc-floor-chip"
                    data-active={activeFloor?.id === floor.id ? "true" : "false"}
                    onClick={() => loadFloor(floor.id)}
                  >
                    {floor.label}
                  </button>
                ))
              )}
            </div>
            <div className="upc-actions mt-2">
              <input
                value={newFloorLabel}
                onChange={(e) => setNewFloorLabel(e.target.value)}
                placeholder={ordered.length ? `L${ordered.length}` : "Ground"}
                maxLength={40}
                aria-label="New floor label"
              />
              <button type="button" className="upc-tool" onClick={addFloor} disabled={pending}>
                <Plus size={14} strokeWidth={1.75} aria-hidden />
                Add floor
              </button>
            </div>
          </div>

          <div>
            <h3>Auto-design from areas</h3>
            <div className="upc-field mt-2">
              <span>Total floor area</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={5_000_000}
                  step="any"
                  value={totalArea}
                  onChange={(e) => setTotalArea(Number(e.target.value))}
                />
                <select
                  value={areaUnit}
                  onChange={(e) => toggleAreaUnit(e.target.value as PlanAreaUnit)}
                  aria-label="Area unit"
                >
                  <option value="sqft">sq ft</option>
                  <option value="sqyd">sq yd</option>
                </select>
              </div>
            </div>
            <div className="upc-partitions mt-3">
              {partitions.map((row, index) => (
                <div key={index} className="upc-partition-row">
                  <input
                    value={row.code}
                    onChange={(e) =>
                      setPartitions((prev) =>
                        prev.map((p, i) =>
                          i === index ? { ...p, code: e.target.value.slice(0, 12) } : p,
                        ),
                      )
                    }
                    aria-label={`Unit ${index + 1} code`}
                    placeholder={`Unit ${index + 1}`}
                  />
                  <input
                    type="number"
                    min={1}
                    max={5_000_000}
                    value={row.sqft}
                    onChange={(e) =>
                      setPartitions((prev) =>
                        prev.map((p, i) =>
                          i === index ? { ...p, sqft: Number(e.target.value) } : p,
                        ),
                      )
                    }
                    aria-label={`Unit ${index + 1} area`}
                  />
                  <button
                    type="button"
                    className="upc-tool"
                    aria-label={`Remove unit ${index + 1}`}
                    onClick={() => setPartitions((prev) => prev.filter((_, i) => i !== index))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="upc-tool"
                onClick={() =>
                  setPartitions((prev) => [
                    ...prev,
                    { code: String(prev.length + 1), sqft: 1000 },
                  ])
                }
              >
                <Plus size={14} strokeWidth={1.75} aria-hidden />
                Add unit row
              </button>
            </div>
            <div className="upc-field mt-3">
              <span>Layout seed</span>
              <input
                type="number"
                min={0}
                max={1_000_000}
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value) || 0)}
              />
            </div>
            <div className="upc-actions mt-3">
              <button type="button" className="upc-tool" onClick={() => runAutoDesign(false)}>
                <Wand2 size={14} strokeWidth={1.75} aria-hidden />
                Generate layout
              </button>
              <button type="button" className="upc-tool" onClick={() => runAutoDesign(true)}>
                Random seed
              </button>
            </div>
          </div>
        </aside>
      </div>

      <div className="upc-status" role="status">
        {activeFloor ? `${activeFloor.label} · ` : "No floor · "}
        {draft.elements.length} element{draft.elements.length === 1 ? "" : "s"}
        {wallStart ? " · wall: click end point" : ""}
        {tool !== "select" ? ` · tool ${tool}` : ""}
        {message ? ` · ${message}` : ""}
        {pending ? " · saving…" : ""}
      </div>
    </div>
  )
}

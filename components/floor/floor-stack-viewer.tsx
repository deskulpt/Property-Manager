"use client"

import Link from "next/link"
import gsap from "gsap"
import {
  Bath,
  Building2,
  DoorOpen,
  Layers,
  Minus,
  MousePointer2,
  Plus,
  RotateCcw,
  X,
  Zap,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import type { UnitStatus } from "@/lib/format"
import "./floor-stack-stage.css"

export type FloorStackLevel = {
  id: string
  label: string
  levelIndex: number
  planPath: string | null
}

export type FloorStackMarker = {
  href: string
  code: string
  x: number
  y: number
  status: UnitStatus
  floorId: string | null
}

const VISIBLE_CHIPS = 5
const HOLD_MS = 420
const STACK_GAP = 28
const STACK_SKEW_X = -18
const STACK_ROTATE_X = 58

/** Only same-origin plan paths already used by the app. Never inject as HTML. */
function safePlanSrc(src: string | null | undefined): string | null {
  if (!src || typeof src !== "string") return null
  if (src.startsWith("/floorplans/") || src.startsWith("/files/")) return src
  return null
}

/** Unit links stay in-app relative paths. */
function safeUnitHref(href: string): string {
  if (href.startsWith("/properties/") && !href.includes("//")) return href
  return "#"
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  return reduced
}

/**
 * Side-stacked building floor viewer (PRD §4.4 + Aloke animate pass).
 * GSAP core only — hover slide, click/hold flip-open, click-away settle.
 * Public read-only; no write endpoints.
 */
export function FloorStackViewer({
  floors,
  markers,
  buildingName,
}: {
  floors: FloorStackLevel[]
  markers: FloorStackMarker[]
  buildingName: string
}) {
  const ordered = useMemo(
    () => [...floors].sort((a, b) => a.levelIndex - b.levelIndex),
    [floors],
  )
  const ground = ordered[0]
  const [focusId, setFocusId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const stageRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reducedMotion = usePrefersReducedMotion()

  const openFloor = ordered.find((f) => f.id === openId) ?? null
  const focusFloor = ordered.find((f) => f.id === focusId) ?? null
  const statusFloor = openFloor ?? focusFloor ?? ground
  const statusIndex = statusFloor ? ordered.findIndex((f) => f.id === statusFloor.id) : 0

  const openMarkers = useMemo(
    () => (openFloor ? markers.filter((m) => m.floorId === openFloor.id) : []),
    [markers, openFloor],
  )

  const clearHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }, [])

  const openLevel = useCallback((id: string) => {
    setOpenId(id)
    setFocusId(id)
    setZoom(1)
  }, [])

  const closeOpen = useCallback(() => {
    setOpenId(null)
    setZoom(1)
  }, [])

  const selectFloor = useCallback(
    (id: string) => {
      if (openId) {
        openLevel(id)
        return
      }
      setFocusId(id)
    },
    [openId, openLevel],
  )

  const move = useCallback(
    (delta: number) => {
      if (!ordered.length) return
      const baseId = openId ?? focusId ?? ground?.id
      const baseIndex = Math.max(
        0,
        ordered.findIndex((f) => f.id === baseId),
      )
      const next = Math.max(0, Math.min(ordered.length - 1, baseIndex + delta))
      const id = ordered[next].id
      if (openId) openLevel(id)
      else setFocusId(id)
    },
    [focusId, ground?.id, openId, openLevel, ordered],
  )

  // Keyboard: arrows change level; Escape closes open / clears focus
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowUp") {
        event.preventDefault()
        move(1)
      } else if (event.key === "ArrowDown") {
        event.preventDefault()
        move(-1)
      } else if (event.key === "Escape") {
        if (openId) closeOpen()
        else setFocusId(null)
      } else if (event.key === "Enter" && focusId && !openId) {
        openLevel(focusId)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [closeOpen, focusId, move, openId, openLevel])

  useEffect(() => {
    const el = listRef.current
    if (!el || !statusFloor) return
    const chip = el.querySelector<HTMLElement>(`[data-floor-id="${statusFloor.id}"]`)
    chip?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" })
  }, [statusFloor, reducedMotion])

  const enteredRef = useRef(false)

  // GSAP core only: enter settle + hover focus layout (kill on unmount via context)
  useEffect(() => {
    const root = stageRef.current
    if (!root || openId) return

    const ctx = gsap.context(() => {
      const plates = gsap.utils.toArray<HTMLElement>(".fs-plate")
      if (!plates.length) return

      const mid = (ordered.length - 1) / 2
      const duration = reducedMotion ? 0 : 0.45
      const ease = "power3.out"
      const entering = !enteredRef.current && !reducedMotion
      enteredRef.current = true

      plates.forEach((plate, plateIndex) => {
        const idx = Number(plate.dataset.index ?? 0)
        const id = plate.dataset.floorId ?? ""
        const isFocus = focusId === id
        const delta = idx - mid
        const y = -delta * STACK_GAP + (isFocus ? -36 : 0)
        const x = isFocus ? 72 : delta * 4
        const z = isFocus ? 120 : idx * 8
        const scale = isFocus ? 1.06 : 0.92 - Math.min(Math.abs(delta), 4) * 0.015
        const opacity = isFocus ? 1 : Math.max(0.35, 0.85 - Math.abs(delta) * 0.08)

        if (entering) {
          gsap.fromTo(
            plate,
            { opacity: 0, y: y + 36, x, z, scale, rotateX: STACK_ROTATE_X, rotateZ: STACK_SKEW_X },
            {
              opacity,
              x,
              y,
              z,
              scale,
              rotateX: STACK_ROTATE_X,
              rotateZ: STACK_SKEW_X,
              duration: 0.55,
              delay: plateIndex * 0.04,
              ease: "power2.out",
              overwrite: "auto",
            },
          )
        } else {
          gsap.to(plate, {
            x,
            y,
            z,
            scale,
            opacity,
            rotateX: STACK_ROTATE_X,
            rotateZ: STACK_SKEW_X,
            duration,
            ease,
            overwrite: "auto",
          })
        }
      })
    }, root)

    return () => ctx.revert()
  }, [focusId, openId, ordered.length, reducedMotion])

  // GSAP: flip-open / close the full plan layer
  useEffect(() => {
    const root = stageRef.current
    if (!root) return
    const openEl = root.querySelector<HTMLElement>(".fs-open")
    if (!openEl) return

    const ctx = gsap.context(() => {
      if (!openId) {
        gsap.set(openEl, { autoAlpha: 0, pointerEvents: "none" })
        return
      }
      if (reducedMotion) {
        gsap.set(openEl, { autoAlpha: 1, rotateX: 0, y: 0, pointerEvents: "auto" })
        return
      }
      gsap.fromTo(
        openEl,
        { autoAlpha: 0, rotateX: 55, y: 48, transformOrigin: "50% 100%" },
        {
          autoAlpha: 1,
          rotateX: 0,
          y: 0,
          duration: 0.5,
          ease: "power3.out",
          pointerEvents: "auto",
          overwrite: "auto",
        },
      )
    }, root)

    return () => ctx.revert()
  }, [openId, reducedMotion])

  useEffect(() => () => clearHold(), [clearHold])

  if (!ordered.length || !ground) {
    return null
  }

  function onPlatePointerEnter(id: string) {
    if (openId) return
    setFocusId(id)
  }

  function onPlatePointerLeave(id: string) {
    if (openId) return
    setFocusId((current) => (current === id ? null : current))
  }

  function onPlatePointerDown(id: string, event: ReactPointerEvent) {
    if (event.button !== 0) return
    clearHold()
    holdTimer.current = setTimeout(() => {
      openLevel(id)
      holdTimer.current = null
    }, HOLD_MS)
  }

  function onPlateClick(id: string) {
    clearHold()
    if (openId === id) return
    openLevel(id)
  }

  function onScenePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains("fs-scene-inner")) {
      if (openId) closeOpen()
      else setFocusId(null)
    }
  }

  const maxChipHeight = VISIBLE_CHIPS * 36
  const bayCount = statusFloor
    ? markers.filter((m) => m.floorId === statusFloor.id).length
    : 0

  return (
    <div
      ref={stageRef}
      className="floor-stack-stage"
      role="region"
      aria-label={`Floor stack for ${buildingName}`}
    >
      <div className="fs-scene" onPointerDown={onScenePointerDown}>
        <div className="fs-scene-inner" aria-hidden={Boolean(openId)}>
          {[...ordered].reverse().map((floor, reverseIndex) => {
            const idx = ordered.length - 1 - reverseIndex
            const src = safePlanSrc(floor.planPath)
            const focused = focusId === floor.id && !openId
            return (
              <button
                key={floor.id}
                type="button"
                className="fs-plate"
                data-floor-id={floor.id}
                data-index={idx}
                data-focused={focused ? "true" : "false"}
                style={{ zIndex: focused ? 50 : 10 + idx }}
                aria-label={`${floor.label} floor plate`}
                aria-pressed={openId === floor.id}
                onPointerEnter={() => onPlatePointerEnter(floor.id)}
                onPointerLeave={() => onPlatePointerLeave(floor.id)}
                onPointerDown={(e) => onPlatePointerDown(floor.id, e)}
                onPointerUp={clearHold}
                onPointerCancel={clearHold}
                onClick={() => onPlateClick(floor.id)}
                onFocus={() => onPlatePointerEnter(floor.id)}
              >
                <div className="fs-plate-face">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" draggable={false} />
                  ) : (
                    <div className="fs-plate-empty">No plate for {floor.label}</div>
                  )}
                  <span className="fs-plate-label">
                    <Layers size={12} strokeWidth={1.75} aria-hidden />
                    {floor.label}
                  </span>
                  <span className="fs-plate-pointer" aria-hidden>
                    <MousePointer2 size={14} strokeWidth={1.75} />
                  </span>
                </div>
                <span className="fs-plate-edge" aria-hidden />
              </button>
            )
          })}
        </div>

        <div
          className="fs-open"
          aria-hidden={!openFloor}
          style={{ pointerEvents: openFloor ? "auto" : "none" }}
        >
          {openFloor ? (
            <>
              <div className="fs-open-toolbar">
                <div className="fs-title">
                  <Building2 size={14} strokeWidth={1.75} aria-hidden />
                  {openFloor.label}
                  <span className="fs-hint">· open plan</span>
                </div>
                <div className="fs-open-actions">
                  <button
                    type="button"
                    className="fs-icon-btn"
                    aria-label="Zoom out"
                    onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.15).toFixed(2))))}
                  >
                    <Minus size={14} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className="fs-icon-btn"
                    aria-label="Zoom in"
                    onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                  >
                    <Plus size={14} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className="fs-icon-btn"
                    aria-label="Reset zoom"
                    onClick={() => setZoom(1)}
                  >
                    <RotateCcw size={14} strokeWidth={1.75} />
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    className="fs-icon-btn"
                    aria-label="Close floor plan"
                    onClick={closeOpen}
                  >
                    <X size={14} strokeWidth={1.75} />
                    Close
                  </button>
                </div>
              </div>
              <div className="fs-open-canvas">
                <div className="fs-open-plate" style={{ transform: `scale(${zoom})` }}>
                  {safePlanSrc(openFloor.planPath) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={safePlanSrc(openFloor.planPath) as string}
                      alt={`Floor plan · ${openFloor.label} · ${buildingName}`}
                      draggable={false}
                    />
                  ) : (
                    <div className="fs-plate-empty" style={{ minHeight: 320 }}>
                      No plate for {openFloor.label}
                    </div>
                  )}
                  <div className="absolute inset-0">
                    {openMarkers.map((marker) => (
                      <Link
                        key={marker.code}
                        href={safeUnitHref(marker.href)}
                        className="fs-pin"
                        data-status={marker.status}
                        style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                      >
                        {marker.code}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="fs-chrome">
        <div className="fs-controls">
          <div
            ref={listRef}
            className="fs-chips"
            style={{ maxHeight: maxChipHeight }}
            role="listbox"
            aria-label="Floor selector"
            aria-activedescendant={
              statusFloor ? `floor-chip-${statusFloor.id}` : undefined
            }
          >
            {[...ordered].reverse().map((floor) => {
              const selected = statusFloor?.id === floor.id
              return (
                <button
                  key={floor.id}
                  id={`floor-chip-${floor.id}`}
                  type="button"
                  data-floor-id={floor.id}
                  role="option"
                  aria-selected={selected}
                  className="fs-chip"
                  onClick={() => {
                    selectFloor(floor.id)
                    if (openId) openLevel(floor.id)
                  }}
                >
                  {floor.label}
                </button>
              )
            })}
          </div>
          <label className="sr-only" htmlFor="floor-stack-select">
            Floor dropdown
          </label>
          <select
            id="floor-stack-select"
            className="fs-select"
            value={statusFloor?.id ?? ""}
            onChange={(event) => {
              const id = event.target.value
              selectFloor(id)
              if (openId) openLevel(id)
            }}
            aria-label="Floor dropdown"
          >
            {ordered.map((floor) => (
              <option key={floor.id} value={floor.id}>
                {floor.label}
              </option>
            ))}
          </select>
          {focusId && !openId ? (
            <button
              type="button"
              className="fs-icon-btn"
              onClick={() => openLevel(focusId)}
            >
              Open floor
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="fs-legend" aria-label="Unit status colours">
            <span>
              <i className="fs-swatch" data-status="available" /> Available
            </span>
            <span>
              <i className="fs-swatch" data-status="pending" /> Pending
            </span>
            <span>
              <i className="fs-swatch" data-status="leased" /> Leased
            </span>
          </div>
          <div className="fs-amenity-row" aria-hidden>
            <span className="fs-amenity">
              <DoorOpen size={12} strokeWidth={1.75} /> Room
            </span>
            <span className="fs-amenity">
              <Bath size={12} strokeWidth={1.75} /> Bath
            </span>
            <span className="fs-amenity">
              <Zap size={12} strokeWidth={1.75} /> Lift / power
            </span>
          </div>
        </div>
      </div>

      <div className="fs-status">
        {openFloor ? (
          <>
            Open · {openFloor.label} · {openMarkers.length} bay
            {openMarkers.length === 1 ? "" : "s"} · zoom ± · Esc closes
          </>
        ) : (
          <>
            Stack · {statusFloor?.label ?? "—"}
            {focusFloor ? " · focused" : ""} · {bayCount} bay
            {bayCount === 1 ? "" : "s"} · hover to focus · click or hold to open
            {ordered.length > VISIBLE_CHIPS ? " · chips scroll" : ""}
            {statusIndex >= 0 ? (
              <span className="fs-hint"> · arrows change level</span>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

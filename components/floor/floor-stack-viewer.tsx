"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { UnitStatus } from "@/lib/format"

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

const pin: Record<UnitStatus, string> = {
  available: "bg-avail text-white",
  pending: "bg-pending text-ink",
  leased: "bg-leased text-white",
}

const VISIBLE_CHIPS = 5
const STACK_STEP_PX = 18

/**
 * Progressive-enhancement floor peel (PRD §4.4): 2D plates stacked in CSS.
 * Active floor opaque; below = ghost; above = hidden. Selector scrolls when >5.
 * GLB/IFC path can replace the plate layer later without changing this shell.
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
  const [activeId, setActiveId] = useState(ground?.id ?? "")
  const [showAll, setShowAll] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const active = ordered.find((f) => f.id === activeId) ?? ground
  const activeIndex = active ? ordered.findIndex((f) => f.id === active.id) : 0

  const move = useCallback(
    (delta: number) => {
      if (!ordered.length) return
      const next = Math.max(0, Math.min(ordered.length - 1, activeIndex + delta))
      setActiveId(ordered[next].id)
    },
    [activeIndex, ordered],
  )

  useEffect(() => {
    const el = listRef.current
    if (!el || !active) return
    const chip = el.querySelector<HTMLElement>(`[data-floor-id="${active.id}"]`)
    chip?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [active])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowUp") {
        event.preventDefault()
        move(1)
      } else if (event.key === "ArrowDown") {
        event.preventDefault()
        move(-1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [move])

  if (!ordered.length || !active) {
    return null
  }

  const activeMarkers = markers.filter((m) => m.floorId === active.id)
  const maxChipHeight = VISIBLE_CHIPS * 40

  return (
    <div className="relative border border-border bg-brand-deep">
      <div
        className="relative overflow-hidden"
        style={{ minHeight: 360, perspective: "1200px" }}
        role="region"
        aria-label={`Floor stack for ${buildingName}`}
      >
        {ordered.map((floor) => {
          const idx = ordered.findIndex((f) => f.id === floor.id)
          const delta = idx - activeIndex
          const isActive = floor.id === active.id
          const below = delta < 0
          const above = delta > 0

          if (above && !showAll) return null

          const opacity = isActive ? 1 : showAll ? 0.35 : below ? Math.max(0.18, 0.45 + delta * 0.08) : 0
          const translateY = showAll
            ? (ordered.length - 1 - idx) * STACK_STEP_PX
            : isActive
              ? 0
              : below
                ? Math.abs(delta) * STACK_STEP_PX
                : 0
          const scale = isActive ? 1 : 0.97 - Math.min(Math.abs(delta), 4) * 0.01
          const z = isActive ? 40 : below ? 10 + idx : 5

          return (
            <div
              key={floor.id}
              className="absolute inset-0 origin-bottom transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none"
              style={{
                opacity,
                zIndex: z,
                transform: `translateY(${translateY}px) scale(${scale})`,
                pointerEvents: isActive ? "auto" : "none",
              }}
              aria-hidden={!isActive}
            >
              {floor.planPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={floor.planPath}
                  alt=""
                  className="block h-auto w-full"
                  draggable={false}
                />
              ) : (
                <div className="flex h-[360px] items-center justify-center bg-brand text-sm text-paper">
                  No plate for {floor.label}
                </div>
              )}
              {isActive ? (
                <div className="absolute inset-0">
                  {activeMarkers.map((marker) => (
                    <Link
                      key={marker.code}
                      href={marker.href}
                      className={`absolute flex min-h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center px-2 font-sans text-xs font-extrabold shadow ${pin[marker.status]}`}
                      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    >
                      {marker.code}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="absolute right-3 top-3 z-50 flex flex-col gap-2">
        <div
          ref={listRef}
          className="w-28 overflow-y-auto border border-paper/20 bg-brand/90 shadow-lg backdrop-blur-sm"
          style={{ maxHeight: maxChipHeight }}
          role="listbox"
          aria-label="Floor selector"
          aria-activedescendant={`floor-chip-${active.id}`}
        >
          {[...ordered].reverse().map((floor) => {
            const selected = floor.id === active.id
            return (
              <button
                key={floor.id}
                id={`floor-chip-${floor.id}`}
                type="button"
                data-floor-id={floor.id}
                role="option"
                aria-selected={selected}
                onClick={() => setActiveId(floor.id)}
                className={`flex h-10 w-full items-center justify-center border-b border-paper/10 font-mono text-[11px] uppercase tracking-wider last:border-b-0 ${
                  selected ? "bg-terra text-white" : "text-paper hover:bg-paper/10"
                }`}
              >
                {floor.label}
              </button>
            )
          })}
        </div>
        {ordered.length >= 2 ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="border border-paper/20 bg-brand/90 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-paper"
          >
            {showAll ? "Collapse stack" : "Show all floors"}
          </button>
        ) : null}
      </div>

      <div className="border-t border-paper/10 bg-brand px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-paper/80">
        Active · {active.label} · {activeMarkers.length} bay
        {activeMarkers.length === 1 ? "" : "s"} · arrow keys change level
        {ordered.length > VISIBLE_CHIPS ? " · selector scrolls" : ""}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { submitHotspots } from "@/lib/actions"
import type { UnitStatus } from "@/lib/format"

type Spot = { id: string; code: string; status: UnitStatus; x: number | null; y: number | null }

export function HotspotEditor({
  propertyId,
  src,
  units,
}: {
  propertyId: string
  src: string | null
  units: Spot[]
}) {
  const [spots, setSpots] = useState(units)
  const [selected, setSelected] = useState(units[0]?.id ?? "")
  const [failed, setFailed] = useState(false)
  const current = spots.find((spot) => spot.id === selected)

  function place(event: React.MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-pin]")) return
    if (!selected) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100))
    setSpots((prev) => prev.map((spot) => (spot.id === selected ? { ...spot, x, y } : spot)))
  }

  return (
    <form action={submitHotspots} className="grid gap-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input
        type="hidden"
        name="spots"
        value={JSON.stringify(spots.map((spot) => ({ id: spot.id, x: spot.x, y: spot.y })))}
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div>
          {src && !failed ? (
            <div className="relative cursor-crosshair border border-border bg-brand-deep" onClick={place}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Floor plan being edited" className="block h-auto w-full" onError={() => setFailed(true)} />
              <div className="pointer-events-none absolute inset-0">
                {spots.filter((spot) => spot.x != null && spot.y != null).map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    data-pin
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelected(spot.id)
                    }}
                    className={`pointer-events-auto absolute flex min-h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-terra px-2 font-sans text-xs font-extrabold text-white ${selected === spot.id ? "outline outline-2 outline-offset-2 outline-white" : ""}`}
                    style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                  >
                    {spot.code}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="border border-dashed border-border bg-card px-4 py-10 text-sm text-ink-soft">
              Upload a floor image first, then click the map to drop a bay.
            </p>
          )}
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            {current
              ? `${current.code} · ${current.x == null ? "not placed" : `${current.x.toFixed(1)}% , ${current.y?.toFixed(1)}%`}`
              : "Select a bay"}
          </p>
        </div>
        <div className="grid content-start gap-2">
          {spots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              onClick={() => setSelected(spot.id)}
              className={`flex items-center justify-between border px-3 py-2 text-left ${selected === spot.id ? "border-brand bg-accent" : "border-border bg-card"}`}
            >
              <span className="font-sans font-bold">Unit {spot.code}</span>
              <span className="font-mono text-[10px] uppercase text-ink-faint">{spot.status}</span>
            </button>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setSpots((prev) => prev.map((spot) => (spot.id === selected ? { ...spot, x: null, y: null } : spot)))}
          >
            Clear selected pin
          </Button>
          <Button type="submit">Save hotspot positions</Button>
        </div>
      </div>
    </form>
  )
}

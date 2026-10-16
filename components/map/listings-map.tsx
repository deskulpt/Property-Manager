"use client"

import { useEffect, useMemo, useRef } from "react"
import { googleMapsOpenUrl, isValidMapPin } from "@/lib/maps"
import "leaflet/dist/leaflet.css"

export type ListingMapPin = {
  id: string
  lat: number
  lng: number
  label: string
  href: string
}

export function ListingsMap({ pins }: { pins: ListingMapPin[] }) {
  const host = useRef<HTMLDivElement>(null)
  const valid = useMemo(
    () => pins.filter((pin) => isValidMapPin(pin.lat, pin.lng)),
    [pins],
  )

  useEffect(() => {
    if (!host.current || valid.length === 0) return
    let map: import("leaflet").Map | null = null
    let cancelled = false

    ;(async () => {
      const L = (await import("leaflet")).default
      if (cancelled || !host.current) return

      const icon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:12px;height:12px;border-radius:999px;background:#c45c26;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35)"></span>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      })

      map = L.map(host.current, { scrollWheelZoom: false })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      const bounds = L.latLngBounds([])
      for (const pin of valid) {
        const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(map)
        marker.bindPopup(
          `<a href="${pin.href}" style="font-weight:600;color:#c45c26">${pin.label}</a>`,
        )
        bounds.extend([pin.lat, pin.lng])
      }
      if (valid.length === 1) {
        map.setView([valid[0].lat, valid[0].lng], 14)
      } else {
        map.fitBounds(bounds.pad(0.2))
      }
    })()

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [valid])

  if (valid.length === 0) return null

  const first = valid[0]

  return (
    <div className="mb-6 border border-ink/10 bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/10 px-4 py-3">
        <h2 className="font-serif text-lg font-semibold">Map</h2>
        <a
          href={googleMapsOpenUrl({ lat: first.lat, lng: first.lng })}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-terra hover:underline"
        >
          Open in Google Maps
        </a>
      </div>
      <div
        ref={host}
        className="h-[280px] w-full z-0"
        role="img"
        aria-label="Map of matching listings"
      />
      <p className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        Leaflet · © OpenStreetMap · click a pin for the bay
      </p>
    </div>
  )
}

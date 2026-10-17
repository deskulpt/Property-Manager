"use client"

import { useEffect, useRef } from "react"
import {
  appleMapsUrl,
  asMapPin,
  googleMapsDirectionsUrl,
  googleMapsOpenUrl,
  googleMapsStreetViewUrl,
  openStreetMapUrl,
  wazeUrl,
} from "@/lib/maps"

type Props = {
  lat: number | null
  lng: number | null
  label: string
  zoom?: number
  className?: string
}

export function PropertyMap({ lat, lng, label, zoom = 16, className }: Props) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const pin = asMapPin(lat, lng)
    if (!host.current || !pin) return
    let map: import("leaflet").Map | null = null
    let cancelled = false

    ;(async () => {
      await import("leaflet/dist/leaflet.css")
      const L = (await import("leaflet")).default
      if (cancelled || !host.current) return

      // Default marker icons break under bundlers; use a simple div icon.
      const icon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:14px;height:14px;border-radius:999px;background:#c45c26;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })

      map = L.map(host.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([pin.lat, pin.lng], zoom)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      L.marker([pin.lat, pin.lng], { icon }).addTo(map).bindPopup(label)
    })()

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [lat, lng, label, zoom])

  const pin = asMapPin(lat, lng)
  if (!pin) {
    return (
      <p className="border border-dashed border-ink/20 bg-paper-2 px-4 py-8 text-sm text-ink-soft">
        Add a map pin to show this property on the map.
      </p>
    )
  }

  return (
    <div className={className}>
      <div
        ref={host}
        className="h-[320px] w-full border border-border bg-paper-2 z-0"
        role="img"
        aria-label={`Map showing ${label}`}
      />
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <a
          href={googleMapsDirectionsUrl(pin)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-terra hover:underline"
        >
          Directions
        </a>
        <a
          href={googleMapsStreetViewUrl(pin)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-terra hover:underline"
        >
          Street View
        </a>
        <a
          href={googleMapsOpenUrl(pin)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-terra hover:underline"
        >
          Open in maps
        </a>
        <details className="text-ink-soft">
          <summary className="cursor-pointer font-semibold text-ink-soft hover:text-ink">More</summary>
          <div className="mt-2 flex flex-col gap-1 pl-1">
            <a href={appleMapsUrl(pin)} target="_blank" rel="noopener noreferrer" className="hover:underline">
              Apple Maps
            </a>
            <a href={wazeUrl(pin)} target="_blank" rel="noopener noreferrer" className="hover:underline">
              Waze
            </a>
            <a href={openStreetMapUrl(pin)} target="_blank" rel="noopener noreferrer" className="hover:underline">
              OpenStreetMap
            </a>
          </div>
        </details>
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        Leaflet · © OpenStreetMap contributors · no map API key
      </p>
    </div>
  )
}

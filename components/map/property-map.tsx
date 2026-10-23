"use client"

import { useEffect, useRef } from "react"
import {
  buildMapLinks,
  osmAttribution,
  osmTileUrl,
  resolvePublicPin,
  type MapPinInput,
} from "@/lib/maps"
import "leaflet/dist/leaflet.css"

type Props = {
  latitude: number | null
  longitude: number | null
  address: string
  label: string
  entranceLatitude?: number | null
  entranceLongitude?: number | null
  entranceLabel?: string | null
  hideExactPin?: boolean
  zoom?: number
  className?: string
  /** @deprecated prefer latitude/longitude + address */
  lat?: number | null
  /** @deprecated prefer latitude/longitude + address */
  lng?: number | null
}

export function PropertyMap({
  latitude,
  longitude,
  address,
  label,
  entranceLatitude,
  entranceLongitude,
  entranceLabel,
  hideExactPin,
  zoom = 16,
  className,
  lat,
  lng,
}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const input: MapPinInput = {
    latitude: latitude ?? lat ?? null,
    longitude: longitude ?? lng ?? null,
    address,
    name: label,
    entranceLatitude,
    entranceLongitude,
    entranceLabel,
    hideExactPin,
  }
  const display = resolvePublicPin(input)
  const links = buildMapLinks(input)

  useEffect(() => {
    if (!host.current || !display) return
    let map: import("leaflet").Map | null = null
    let cancelled = false

    ;(async () => {
      const L = (await import("leaflet")).default
      if (cancelled || !host.current) return

      const icon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:14px;height:14px;border-radius:999px;background:#c45c26;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })

      map = L.map(host.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([display.lat, display.lng], zoom)

      L.tileLayer(osmTileUrl(), {
        attribution: osmAttribution(),
        maxZoom: 19,
      }).addTo(map)

      L.marker([display.lat, display.lng], { icon }).addTo(map).bindPopup(label)
    })()

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [display, label, zoom])

  if (!display) {
    return (
      <p className="border border-dashed border-ink/20 bg-paper-2 px-4 py-8 text-sm text-ink-soft">
        Add a map pin to show this property on the map.
      </p>
    )
  }

  return (
    <div className={className} data-testid="map-actions">
      <div
        ref={host}
        className="h-[320px] w-full border border-border bg-paper-2 z-0"
        role="img"
        aria-label={`Map showing ${label}`}
      />
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <a
          href={links.directions}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-terra hover:underline"
          data-testid="map-link-directions"
        >
          Directions
          {links.directionsTargetLabel ? ` · ${links.directionsTargetLabel}` : ""}
        </a>
        <a
          href={links.streetView}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-terra hover:underline"
          data-testid="map-link-street-view"
        >
          Street View
        </a>
        <a
          href={links.openInMaps}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-terra hover:underline"
          data-testid="map-link-open"
        >
          Open in maps
        </a>
        <details className="text-ink-soft">
          <summary className="cursor-pointer font-semibold text-ink-soft hover:text-ink">More</summary>
          <div className="mt-2 flex flex-col gap-1 pl-1">
            <a href={links.appleMaps} target="_blank" rel="noopener noreferrer" className="hover:underline">
              Apple Maps
            </a>
            <a href={links.waze} target="_blank" rel="noopener noreferrer" className="hover:underline">
              Waze
            </a>
            <a
              href={links.openStreetMap}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
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

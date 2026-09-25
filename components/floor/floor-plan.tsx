"use client"

import { useState } from "react"
import Link from "next/link"
import { EmptyState } from "@/components/product"
import type { UnitStatus } from "@/lib/format"

const pin: Record<UnitStatus, string> = {
  available: "bg-avail text-white",
  pending: "bg-pending text-ink",
  leased: "bg-leased text-white",
}

export function FloorPlanView({
  src,
  alt,
  markers,
}: {
  src: string | null
  alt: string
  markers: { href: string; code: string; x: number; y: number; status: UnitStatus }[]
}) {
  const [failed, setFailed] = useState(false)
  if (!src) {
    return (
      <EmptyState
        title="No floor plan yet"
        body="The landlord has not uploaded a floor map for this building."
      />
    )
  }
  if (failed) {
    return (
      <EmptyState
        title="Floor plan failed to load"
        body="The image path is on file, but the file did not load. Re-upload it from the landlord desk."
      />
    )
  }
  return (
    <div className="relative border border-border bg-brand-deep">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block h-auto w-full" onError={() => setFailed(true)} />
      <div className="absolute inset-0">
        {markers.map((marker) => (
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
    </div>
  )
}

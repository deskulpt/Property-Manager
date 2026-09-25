"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { rateLabel, sqft, type UnitStatus } from "@/lib/format"

export type MapUnit = {
  code: string
  sqft: number
  clearHeight: string
  docks: number
  driveIns: number
  power: string
  ratePsf: number
  status: UnitStatus
}

export type MapProperty = {
  slug: string
  name: string
  cityLine: string
  address: string
  landlord: string
  units: MapUnit[]
}

const tone: Record<UnitStatus, string> = {
  available: "border-avail bg-avail/15 text-[#d7f5e2]",
  pending: "border-pending bg-pending/20 text-[#f0d59a]",
  leased: "border-leased/50 bg-white/5 text-white/45",
}

export function LeasingMap({ properties }: { properties: MapProperty[] }) {
  const [slug, setSlug] = useState(properties[0]?.slug ?? "")
  const [code, setCode] = useState<string | null>(null)
  const property = properties.find((item) => item.slug === slug) ?? properties[0]
  const selected = property?.units.find((unit) => unit.code === code) ?? null
  const max = useMemo(
    () => Math.max(1, ...(property?.units.map((unit) => unit.sqft) ?? [1])),
    [property],
  )

  if (!property) return null

  return (
    <div className="mt-12 overflow-hidden border border-white/20 bg-brand-deep">
      <div className="flex flex-wrap gap-2 border-b border-white/15 p-4">
        {properties.map((item) => {
          const open = item.units.filter((unit) => unit.status === "available").length
          const on = item.slug === property.slug
          return (
            <button
              key={item.slug}
              type="button"
              onClick={() => {
                setSlug(item.slug)
                setCode(null)
              }}
              className={`px-3 py-2 text-left font-sans text-sm font-bold ${on ? "bg-terra text-white" : "border border-white/20 text-white/70"}`}
            >
              {item.name}
              <small className="mt-0.5 block font-mono text-[10px] font-normal tracking-wide">
                {open} available · {item.landlord}
              </small>
            </button>
          )
        })}
      </div>
      <div className="grid min-h-[480px] lg:grid-cols-[1.55fr_1fr]">
        <div
          className="border-b border-white/15 p-6 lg:border-r lg:border-b-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(244,241,234,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(244,241,234,.05) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3 className="font-sans text-lg font-extrabold text-paper">{property.name}</h3>
            <p className="font-mono text-[11px] tracking-wide text-white/50">{property.cityLine}</p>
          </div>
          <div className="relative border border-white/35 p-3">
            <span className="absolute -top-2 left-4 bg-brand-deep px-2 font-mono text-[9px] tracking-[0.12em] text-white/45">
              BUILDING FOOTPRINT · LIVE DEMO
            </span>
            <div className="mb-2 flex gap-1">
              {Array.from({ length: 6 }).map((_, index) => (
                <i key={index} className="h-2 flex-1 bg-[repeating-linear-gradient(45deg,rgba(244,241,234,.22),rgba(244,241,234,.22)_3px,transparent_3px,transparent_6px)]" />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {property.units.map((unit) => (
                <button
                  key={unit.code}
                  type="button"
                  onClick={() => setCode(unit.code)}
                  className={`min-w-[90px] border px-3 py-3 text-left ${tone[unit.status]} ${code === unit.code ? "outline outline-2 outline-offset-1 outline-terra" : ""}`}
                  style={{ flexGrow: unit.sqft / max * 3 + 1 }}
                >
                  <div className="font-sans text-[15px] font-extrabold">{unit.code}</div>
                  <div className="mt-1 font-mono text-[10px]">{sqft(unit.sqft)}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 font-mono text-[11px] text-white/60">
            <span className="inline-flex items-center gap-2"><i className="size-2.5 bg-avail" /> Available</span>
            <span className="inline-flex items-center gap-2"><i className="size-2.5 bg-pending" /> Offer pending</span>
            <span className="inline-flex items-center gap-2"><i className="size-2.5 bg-leased" /> Leased</span>
          </div>
        </div>
        <div className="flex flex-col p-6 text-paper">
          {selected ? (
            <>
              <span className={`mb-4 inline-flex w-fit px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${tone[selected.status]}`}>
                {selected.status === "available" ? "Available" : selected.status === "pending" ? "Offer pending" : "Leased"}
              </span>
              <p className="font-sans text-4xl font-black tracking-tight">Unit {selected.code}</p>
              <p className="mt-2 font-mono text-[11px] tracking-wide text-white/55">{property.address.toUpperCase()}</p>
              <dl className="my-5 border-t border-white/15">
                {[
                  ["Leasable area", sqft(selected.sqft)],
                  ["Clear height", selected.clearHeight],
                  ["Dock-level doors", String(selected.docks)],
                  ["Drive-in doors", String(selected.driveIns)],
                  ["Power", selected.power],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-white/10 py-2.5 text-sm">
                    <dt className="font-mono text-[11px] uppercase tracking-wide text-white/60">{label}</dt>
                    <dd className="font-sans font-bold">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="font-sans text-2xl font-black text-[#E2A57E]">
                ${rateLabel(selected.ratePsf)} <small className="font-mono text-xs font-normal text-white/50">/ SF net · annual</small>
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-6">
                <Link href={`/properties/${property.slug}/units/${selected.code}`} className="bg-terra px-4 py-3 font-sans text-sm font-bold text-white">
                  {selected.status === "leased" ? "View this bay" : "Open this bay"}
                </Link>
                <Link href={`/properties/${property.slug}`} className="border border-white/30 px-4 py-3 font-sans text-sm font-bold text-paper">
                  Floor plan
                </Link>
              </div>
            </>
          ) : (
            <div className="m-auto text-center font-mono text-[13px] leading-7 text-white/40">
              ◳
              <br />
              <br />
              Select a bay to view its specifications.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

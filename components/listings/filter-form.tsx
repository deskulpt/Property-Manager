"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ListingFilters } from "@/lib/db"
import { PROPERTY_SEGMENTS, segmentLabel, type PropertySegment } from "@/lib/listing-schemas"
import { useState } from "react"

export function ListingsFilterForm({
  facets,
  filters,
}: {
  facets: { areas: string[]; landlords: { id: string; name: string }[] }
  filters: ListingFilters
}) {
  const router = useRouter()
  const [statuses, setStatuses] = useState<string[]>(filters.statuses ?? [])
  const [tenantId, setTenantId] = useState(filters.tenantId ?? "")
  const [area, setArea] = useState(filters.area ?? "")
  const [segment, setSegment] = useState(filters.segment ?? "")
  const [sort, setSort] = useState(filters.sort ?? "name")
  const [hasFloorPlan, setHasFloorPlan] = useState(Boolean(filters.hasFloorPlan))
  const [hasMatterport, setHasMatterport] = useState(Boolean(filters.hasMatterport))
  const [hasPano, setHasPano] = useState(Boolean(filters.hasPano))

  const landlordItems = [
    { value: " ", label: "Any landlord" },
    ...facets.landlords.map((item) => ({ value: item.id, label: item.name })),
  ]
  const areaItems = [
    { value: " ", label: "Any area" },
    ...facets.areas.map((item) => ({ value: item, label: item })),
  ]
  const segmentItems = [
    { value: " ", label: "All segments" },
    ...PROPERTY_SEGMENTS.map((value) => ({ value, label: segmentLabel(value) })),
  ]
  const sortItems = [
    { value: "name", label: "Building / unit" },
    { value: "monthly_asc", label: "Monthly rent · low to high" },
    { value: "monthly_desc", label: "Monthly rent · high to low" },
    { value: "rate_asc", label: "₹/SF · low to high" },
    { value: "rate_desc", label: "₹/SF · high to low" },
    { value: "sqft_asc", label: "Area · small to large" },
    { value: "sqft_desc", label: "Area · large to small" },
  ]

  const activeSegment = (segment || "") as PropertySegment | ""
  const showWarehouse = !activeSegment || activeSegment === "warehouse"
  const showCommercial = !activeSegment || activeSegment === "commercial"
  const showResidential = !activeSegment || activeSegment === "residential"

  function toggleStatus(status: string, on: boolean) {
    setStatuses((prev) => (on ? [...new Set([...prev, status])] : prev.filter((item) => item !== status)))
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const next = new URLSearchParams()
    const q = String(form.get("q") ?? "").trim()
    if (q) next.set("q", q)
    if (tenantId.trim()) next.set("tenantId", tenantId.trim())
    if (area.trim()) next.set("area", area.trim())
    if (segment.trim()) next.set("segment", segment.trim())
    for (const status of statuses) next.append("status", status)
    for (const key of [
      "minSqft",
      "maxSqft",
      "minRate",
      "maxRate",
      "minMonthly",
      "maxMonthly",
      "minDocks",
      "minDriveIns",
      "minClearHeight",
      "power",
      "bhk",
      "furnishing",
      "fitOut",
    ] as const) {
      const value = String(form.get(key) ?? "").trim()
      if (value) next.set(key, value)
    }
    if (hasFloorPlan) next.set("hasFloorPlan", "1")
    if (hasMatterport) next.set("hasMatterport", "1")
    if (hasPano) next.set("hasPano", "1")
    if (sort && sort !== "name") next.set("sort", sort)
    router.push(next.toString() ? `/listings?${next}` : "/listings")
  }

  return (
    <form
      onSubmit={onSubmit}
      className="desk-chrome grid h-fit gap-5 border border-ink/10 bg-card p-5 lg:sticky lg:top-24"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="q" className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
          Search
        </Label>
        <Input
          id="q"
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Hyderabad, docks, Jubilee…"
          className="rounded-sm"
        />
      </div>
      <div className="grid gap-1.5">
        <Label className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
          Segment
        </Label>
        <Select
          items={segmentItems}
          value={segment || " "}
          onValueChange={(value) => setSegment(value && value !== " " ? String(value) : "")}
        >
          <SelectTrigger className="w-full rounded-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {segmentItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
          Landlord
        </Label>
        <Select
          items={landlordItems}
          value={tenantId || " "}
          onValueChange={(value) => setTenantId(value && value !== " " ? String(value) : "")}
        >
          <SelectTrigger className="w-full rounded-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {landlordItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">Area</Label>
        <Select
          items={areaItems}
          value={area || " "}
          onValueChange={(value) => setArea(value && value !== " " ? String(value) : "")}
        >
          <SelectTrigger className="w-full rounded-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {areaItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <fieldset className="grid gap-2.5">
        <legend className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
          Status
        </legend>
        {(["available", "pending", "leased"] as const).map((status) => (
          <label key={status} className="flex items-center gap-2 text-sm capitalize">
            <Checkbox
              checked={statuses.includes(status)}
              onCheckedChange={(checked) => toggleStatus(status, checked === true)}
            />
            {status === "pending" ? "Offer pending" : status}
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label
            htmlFor="minMonthly"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint"
          >
            Min ₹/mo
          </Label>
          <Input
            id="minMonthly"
            name="minMonthly"
            inputMode="numeric"
            defaultValue={filters.minMonthly ?? ""}
            className="rounded-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label
            htmlFor="maxMonthly"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint"
          >
            Max ₹/mo
          </Label>
          <Input
            id="maxMonthly"
            name="maxMonthly"
            inputMode="numeric"
            defaultValue={filters.maxMonthly ?? ""}
            className="rounded-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label
            htmlFor="minSqft"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint"
          >
            Min SF
          </Label>
          <Input
            id="minSqft"
            name="minSqft"
            inputMode="numeric"
            defaultValue={filters.minSqft ?? ""}
            className="rounded-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label
            htmlFor="maxSqft"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint"
          >
            Max SF
          </Label>
          <Input
            id="maxSqft"
            name="maxSqft"
            inputMode="numeric"
            defaultValue={filters.maxSqft ?? ""}
            className="rounded-sm"
          />
        </div>
      </div>
      {showWarehouse ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label
                htmlFor="minRate"
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint"
              >
                Min ₹/SF
              </Label>
              <Input
                id="minRate"
                name="minRate"
                inputMode="decimal"
                defaultValue={filters.minRate ?? ""}
                className="rounded-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label
                htmlFor="maxRate"
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint"
              >
                Max ₹/SF
              </Label>
              <Input
                id="maxRate"
                name="maxRate"
                inputMode="decimal"
                defaultValue={filters.maxRate ?? ""}
                className="rounded-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label
                htmlFor="minDocks"
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint"
              >
                Min docks
              </Label>
              <Input
                id="minDocks"
                name="minDocks"
                inputMode="numeric"
                defaultValue={filters.minDocks ?? ""}
                className="rounded-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label
                htmlFor="minDriveIns"
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint"
              >
                Min drive-ins
              </Label>
              <Input
                id="minDriveIns"
                name="minDriveIns"
                inputMode="numeric"
                defaultValue={filters.minDriveIns ?? ""}
                className="rounded-sm"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor="minClearHeight"
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint"
            >
              Min clear height (ft)
            </Label>
            <Input
              id="minClearHeight"
              name="minClearHeight"
              inputMode="numeric"
              defaultValue={filters.minClearHeight ?? ""}
              className="rounded-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor="power"
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint"
            >
              Power contains
            </Label>
            <Input
              id="power"
              name="power"
              defaultValue={filters.power ?? ""}
              placeholder="600A"
              className="rounded-sm"
            />
          </div>
        </>
      ) : null}
      {showResidential ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label
              htmlFor="bhk"
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint"
            >
              BHK
            </Label>
            <Input
              id="bhk"
              name="bhk"
              inputMode="numeric"
              defaultValue={filters.bhk ?? ""}
              className="rounded-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor="furnishing"
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint"
            >
              Furnishing
            </Label>
            <Input
              id="furnishing"
              name="furnishing"
              defaultValue={filters.furnishing ?? ""}
              placeholder="semi"
              className="rounded-sm"
            />
          </div>
        </div>
      ) : null}
      {showCommercial ? (
        <div className="grid gap-1.5">
          <Label
            htmlFor="fitOut"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint"
          >
            Fit-out
          </Label>
          <Input
            id="fitOut"
            name="fitOut"
            defaultValue={filters.fitOut ?? ""}
            placeholder="warm_shell"
            className="rounded-sm"
          />
        </div>
      ) : null}
      <fieldset className="grid gap-2.5">
        <legend className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
          Media
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={hasFloorPlan}
            onCheckedChange={(checked) => setHasFloorPlan(checked === true)}
          />
          Floor plan on file
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={hasPano} onCheckedChange={(checked) => setHasPano(checked === true)} />
          360 photo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={hasMatterport}
            onCheckedChange={(checked) => setHasMatterport(checked === true)}
          />
          Walkthrough URL
        </label>
      </fieldset>
      <div className="grid gap-1.5">
        <Label className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">Sort</Label>
        <Select
          items={sortItems}
          value={sort}
          onValueChange={(value) => value && setSort(value as ListingFilters["sort"] & string)}
        >
          <SelectTrigger className="w-full rounded-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit">Apply filters</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/listings")}>
          Reset
        </Button>
      </div>
    </form>
  )
}

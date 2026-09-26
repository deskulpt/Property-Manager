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
  const sortItems = [
    { value: "name", label: "Building / unit" },
    { value: "rate_asc", label: "Rate · low to high" },
    { value: "rate_desc", label: "Rate · high to low" },
    { value: "sqft_asc", label: "Area · small to large" },
    { value: "sqft_desc", label: "Area · large to small" },
  ]

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
    for (const status of statuses) next.append("status", status)
    for (const key of ["minSqft", "maxSqft", "minRate", "maxRate", "minDocks", "minDriveIns", "minClearHeight", "power"] as const) {
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
    <form onSubmit={onSubmit} className="grid h-fit gap-4 bg-card p-4 ring-1 ring-foreground/10 lg:sticky lg:top-24">
      <div className="grid gap-2">
        <Label htmlFor="q">Search</Label>
        <Input id="q" name="q" defaultValue={filters.q ?? ""} placeholder="Bhiwandi, docks, Apex…" />
      </div>
      <div className="grid gap-2">
        <Label>Landlord</Label>
        <Select items={landlordItems} value={tenantId || " "} onValueChange={(value) => setTenantId(value && value !== " " ? String(value) : "")}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {landlordItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Area</Label>
        <Select items={areaItems} value={area || " "} onValueChange={(value) => setArea(value && value !== " " ? String(value) : "")}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {areaItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Status</legend>
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
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="minSqft">Min SF</Label>
          <Input id="minSqft" name="minSqft" inputMode="numeric" defaultValue={filters.minSqft ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="maxSqft">Max SF</Label>
          <Input id="maxSqft" name="maxSqft" inputMode="numeric" defaultValue={filters.maxSqft ?? ""} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="minRate">Min $/SF</Label>
          <Input id="minRate" name="minRate" inputMode="decimal" defaultValue={filters.minRate ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="maxRate">Max $/SF</Label>
          <Input id="maxRate" name="maxRate" inputMode="decimal" defaultValue={filters.maxRate ?? ""} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="minDocks">Min docks</Label>
          <Input id="minDocks" name="minDocks" inputMode="numeric" defaultValue={filters.minDocks ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="minDriveIns">Min drive-ins</Label>
          <Input id="minDriveIns" name="minDriveIns" inputMode="numeric" defaultValue={filters.minDriveIns ?? ""} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="minClearHeight">Min clear height (ft)</Label>
        <Input id="minClearHeight" name="minClearHeight" inputMode="numeric" defaultValue={filters.minClearHeight ?? ""} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="power">Power contains</Label>
        <Input id="power" name="power" defaultValue={filters.power ?? ""} placeholder="600A" />
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Media</legend>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={hasFloorPlan} onCheckedChange={(checked) => setHasFloorPlan(checked === true)} />
          Floor plan on file
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={hasPano} onCheckedChange={(checked) => setHasPano(checked === true)} />
          360 photo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={hasMatterport} onCheckedChange={(checked) => setHasMatterport(checked === true)} />
          Walkthrough URL
        </label>
      </fieldset>
      <div className="grid gap-2">
        <Label>Sort</Label>
        <Select items={sortItems} value={sort} onValueChange={(value) => value && setSort(value as ListingFilters["sort"] & string)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {sortItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Apply filters</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/listings")}>
          Reset
        </Button>
      </div>
    </form>
  )
}

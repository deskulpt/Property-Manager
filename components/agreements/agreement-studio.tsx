"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { generateRentalAgreement } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type UnitOpt = {
  id: string
  code: string
  propertyName: string
  propertyLabel: string
  monthlyMajor: number
}

export function AgreementStudioForm({
  units,
  landlordName,
}: {
  units: UnitOpt[]
  landlordName: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const first = units[0]

  return (
    <form
      className="grid gap-4 border border-ink/10 bg-card p-4"
      data-testid="agreement-studio"
      onSubmit={(event) => {
        event.preventDefault()
        const fd = new FormData(event.currentTarget)
        startTransition(async () => {
          const result = await generateRentalAgreement(fd)
          if (result?.error) {
            setError(result.error)
            return
          }
          if (result?.agreementId) router.push(`/agreements/${result.agreementId}`)
        })
      }}
    >
      {error ? (
        <p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="landlordName">Landlord / lessor</Label>
          <Input id="landlordName" name="landlordName" required defaultValue={landlordName} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="tenantPartyName">Tenant / lessee</Label>
          <Input id="tenantPartyName" name="tenantPartyName" required defaultValue="Northline Distribution India" />
        </div>
        <div className="grid gap-1 sm:col-span-2">
          <Label htmlFor="unitId">Unit</Label>
          <select
            id="unitId"
            name="unitId"
            required
            className="h-9 border border-ink/15 bg-paper px-2 text-sm"
            defaultValue={first?.id}
            onChange={(e) => {
              const unit = units.find((u) => u.id === e.target.value)
              if (!unit) return
              const form = e.currentTarget.form
              if (!form) return
              ;(form.elements.namedItem("propertyLabel") as HTMLInputElement).value = unit.propertyLabel
              ;(form.elements.namedItem("unitCode") as HTMLInputElement).value = unit.code
              ;(form.elements.namedItem("rentInr") as HTMLInputElement).value = String(unit.monthlyMajor)
              ;(form.elements.namedItem("depositInr") as HTMLInputElement).value = String(unit.monthlyMajor * 3)
            }}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.propertyName} · Unit {u.code}
              </option>
            ))}
          </select>
        </div>
        <input type="hidden" name="propertyLabel" defaultValue={first?.propertyLabel ?? ""} />
        <input type="hidden" name="unitCode" defaultValue={first?.code ?? ""} />
        <div className="grid gap-1">
          <Label htmlFor="rentInr">Monthly rent (INR)</Label>
          <Input id="rentInr" name="rentInr" type="number" min={1} required defaultValue={first?.monthlyMajor ?? 0} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="depositInr">Security deposit (INR)</Label>
          <Input
            id="depositInr"
            name="depositInr"
            type="number"
            min={0}
            required
            defaultValue={first ? first.monthlyMajor * 3 : 0}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" required defaultValue="2026-11-01" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" required defaultValue="2027-10-31" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="lockInMonths">Lock-in (months)</Label>
          <Input id="lockInMonths" name="lockInMonths" type="number" min={0} defaultValue={11} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="noticeDays">Notice period (days)</Label>
          <Input id="noticeDays" name="noticeDays" type="number" min={0} defaultValue={30} />
        </div>
        <div className="grid gap-1 sm:col-span-2">
          <Label htmlFor="extras">Extra clauses</Label>
          <textarea
            id="extras"
            name="extras"
            rows={3}
            className="border border-ink/15 bg-paper px-2 py-1.5 text-sm"
            placeholder="Parking allotment, fit-out window, GST wording…"
          />
        </div>
      </div>
      <Button type="submit" disabled={pending || units.length === 0}>
        {pending ? "Generating…" : "Generate agreement"}
      </Button>
    </form>
  )
}

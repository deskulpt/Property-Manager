"use client"

import { useMemo, useState } from "react"
import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { submitAssignment, submitJob, type ApplyState } from "@/lib/actions"
import { TRADES, type Trade } from "@/lib/format"
import type { JobRecord, PropertyRecord, ProviderRecord } from "@/lib/db"

const initial: ApplyState = { error: null, fieldErrors: {} }

export function JobDesk({
  jobs,
  properties,
  providers,
}: {
  jobs: JobRecord[]
  properties: PropertyRecord[]
  providers: ProviderRecord[]
}) {
  const [state, action] = useActionState(submitJob, initial)
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "")
  const [trade, setTrade] = useState<Trade>("electrician")
  const [providerId, setProviderId] = useState("")
  const property = properties.find((item) => item.id === propertyId) ?? properties[0]
  const matches = useMemo(
    () =>
      providers.filter(
        (provider) =>
          provider.approval === "approved" &&
          provider.trade === trade &&
          provider.serviceArea === property?.area,
      ),
    [providers, trade, property],
  )
  const propertyItems = properties.map((item) => ({ value: item.id, label: item.name }))
  const tradeItems = TRADES.map((item) => ({ value: item, label: item }))
  const providerItems = matches.map((item) => ({ value: item.id, label: `${item.name} · ${item.serviceArea}` }))

  return (
    <div className="grid gap-8">
      <form action={action} className="grid gap-3 bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-sans text-xl font-extrabold">New concierge job</h2>
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="trade" value={trade} />
        <input type="hidden" name="providerId" value={providerId} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Building</Label>
            <Select items={propertyItems} value={propertyId} onValueChange={(value) => value && setPropertyId(String(value))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {propertyItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="unitId">Bay</Label>
            <select id="unitId" name="unitId" className="h-9 border border-input bg-background px-2 text-sm">
              <option value="">Whole building</option>
              {property?.units.map((unit) => (
                <option key={unit.id} value={unit.id}>Unit {unit.code}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" placeholder="Dock leveler on bay 3" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="details">Details</Label>
          <Textarea id="details" name="details" placeholder="What should the trade do on site?" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Trade</Label>
            <Select items={tradeItems} value={trade} onValueChange={(value) => { if (value) { setTrade(value as Trade); setProviderId("") } }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {tradeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Assign now</Label>
            {matches.length === 0 ? (
              <p className="text-sm text-ink-soft">No approved {trade} in {property?.area}. The job can stay open.</p>
            ) : (
              <Select items={providerItems} value={providerId} onValueChange={(value) => setProviderId(value ? String(value) : "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Leave open" /></SelectTrigger>
                <SelectContent>
                  {providerItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <SubmitButton pendingLabel="Creating…">Create job</SubmitButton>
      </form>

      {jobs.length === 0 ? (
        <EmptyState title="No concierge jobs" body="Create one above, or assign work from an application." />
      ) : (
        <div className="grid gap-3">
          {jobs.map((job) => {
            const options = providers.filter(
              (provider) =>
                provider.approval === "approved" &&
                provider.trade === job.trade &&
                provider.serviceArea === job.area,
            )
            return (
              <article key={job.id} className="grid gap-2 bg-card p-4 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-sans text-lg font-extrabold">{job.title}</h3>
                  <StatusBadge status={job.status} />
                </div>
                <p className="text-sm text-ink-soft">
                  {job.trade} · {job.propertyName}{job.unitCode ? ` · Unit ${job.unitCode}` : ""} · {job.area}
                </p>
                <p className="text-sm">{job.details}</p>
                <p className="text-sm">
                  {job.providerName ? `Assigned to ${job.providerName}` : "Unassigned"}
                </p>
                {job.status !== "complete" ? (
                  <form action={submitAssignment} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="jobId" value={job.id} />
                    {options.length === 0 ? (
                      <p className="text-sm text-ink-soft">No approved {job.trade} in {job.area}.</p>
                    ) : (
                      <>
                        <select name="providerId" className="h-9 border border-input bg-background px-2 text-sm" defaultValue={job.providerId ?? options[0]?.id}>
                          {options.map((provider) => (
                            <option key={provider.id} value={provider.id}>{provider.name}</option>
                          ))}
                        </select>
                        <SubmitButton variant="outline" pendingLabel="Assigning…">Assign</SubmitButton>
                      </>
                    )}
                  </form>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

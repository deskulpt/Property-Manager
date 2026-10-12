"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { reviewApplication, submitJob, type ApplyState } from "@/lib/actions"
import { TRADES, formatDay, type Trade } from "@/lib/format"
import { useActionState } from "react"
import type { ApplicationRecord, ProviderRecord } from "@/lib/db"

const initial: ApplyState = { error: null, fieldErrors: {} }

function AssignDialog({
  application,
  providers,
}: {
  application: ApplicationRecord
  providers: ProviderRecord[]
}) {
  const [trade, setTrade] = useState<Trade>("electrician")
  const [providerId, setProviderId] = useState("")
  const [state, action] = useActionState(submitJob, initial)
  const tradeItems = TRADES.map((item) => ({ value: item, label: item }))
  const matches = useMemo(
    () => providers.filter((provider) => provider.trade === trade && provider.serviceArea === application.propertyArea),
    [providers, trade, application.propertyArea],
  )
  const providerItems = matches.map((provider) => ({ value: provider.id, label: provider.name }))

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Assign concierge</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Concierge job · Unit {application.unitCode}</DialogTitle>
          <DialogDescription>
            Only verified providers approved for {application.propertyArea} appear here.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="propertyId" value={application.propertyId} />
          <input type="hidden" name="unitId" value={application.unitId} />
          <input type="hidden" name="trade" value={trade} />
          <input type="hidden" name="providerId" value={providerId} />
          <div className="grid gap-2">
            <Label htmlFor={`title-${application.id}`}>Title</Label>
            <Input id={`title-${application.id}`} name="title" defaultValue={`Make-ready · Unit ${application.unitCode}`} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`details-${application.id}`}>Details</Label>
            <Textarea id={`details-${application.id}`} name="details" defaultValue={`Requested while reviewing ${application.company}.`} />
          </div>
          <div className="grid gap-2">
            <Label>Trade</Label>
            <Select
              items={tradeItems}
              value={trade}
              onValueChange={(value) => {
                if (!value) return
                setTrade(value as Trade)
                setProviderId("")
              }}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {tradeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Provider</Label>
            {matches.length === 0 ? (
              <p className="text-sm text-ink-soft">No approved {trade} in {application.propertyArea}. Approve one on the providers desk, or leave this unassigned.</p>
            ) : (
              <Select items={providerItems} value={providerId} onValueChange={(value) => setProviderId(value ? String(value) : "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Leave unassigned" /></SelectTrigger>
                <SelectContent>
                  {providerItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton pendingLabel="Assigning…">Create job</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ApplicationInbox({
  applications,
  providers,
}: {
  applications: ApplicationRecord[]
  providers: ProviderRecord[]
}) {
  if (applications.length === 0) {
    return (
      <EmptyState
        title="The inbox is clear"
        body="Applications for this organisation show up here. The other landlord’s pipeline stays on their desk."
      />
    )
  }
  return (
    <div className="grid gap-4">
      {applications.map((application) => (
        <article key={application.id} className="grid gap-3 bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-sans text-xl font-extrabold">{application.company}</h2>
              <p className="text-sm text-ink-soft">
                {application.contactName} · {application.email}
              </p>
            </div>
            <StatusBadge status={application.status} />
          </div>
          <p className="text-sm">
            Unit {application.unitCode} at {application.propertyName} · {application.propertyArea}
          </p>
          <p className="text-sm text-ink-soft">{application.intendedUse}</p>
          {application.notes ? <p className="text-sm">{application.notes}</p> : null}
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            {formatDay(application.createdAt.slice(0, 10))}
            {application.verification
              ? ` · Demo verification ${application.verification.result} ${application.verification.score.toFixed(2)} · ${application.verification.country}`
              : " · No demo verification yet"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/properties/${application.propertySlug}/units/${application.unitCode}`} className="font-sans text-sm font-bold text-brand underline">
              Open the bay
            </Link>
            {application.status === "submitted" ? (
              <>
                <form action={reviewApplication} data-testid={`approve-form-${application.id}`}>
                  <input type="hidden" name="applicationId" value={application.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <SubmitButton data-testid={`approve-${application.id}`} pendingLabel="Approving…">
                    Approve
                  </SubmitButton>
                </form>
                <form action={reviewApplication} data-testid={`deny-form-${application.id}`}>
                  <input type="hidden" name="applicationId" value={application.id} />
                  <input type="hidden" name="decision" value="denied" />
                  <SubmitButton
                    data-testid={`deny-${application.id}`}
                    variant="outline"
                    pendingLabel="Declining…"
                  >
                    Deny
                  </SubmitButton>
                </form>
                <AssignDialog application={application} providers={providers} />
              </>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}

"use client"

import { EmptyState, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { submitProviderTransition } from "@/lib/actions"
import type { JobRecord } from "@/lib/db"

export function ProviderBoard({ jobs }: { jobs: JobRecord[] }) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No jobs on your board"
        body="You only see work a landlord has assigned to you, and only after that landlord has approved you for their area."
      />
    )
  }
  return (
    <div className="grid gap-3">
      {jobs.map((job) => (
        <article key={job.id} className="grid gap-2 bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="font-sans text-xl font-extrabold">{job.title}</h2>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-sm text-ink-soft">
            {job.tenantName} · {job.propertyName}{job.unitCode ? ` · Unit ${job.unitCode}` : ""} · {job.trade}
          </p>
          <p className="text-sm">{job.details}</p>
          {job.status === "assigned" ? (
            <form action={submitProviderTransition}>
              <input type="hidden" name="jobId" value={job.id} />
              <input type="hidden" name="next" value="accepted" />
              <SubmitButton pendingLabel="Accepting…">Accept job</SubmitButton>
            </form>
          ) : null}
          {job.status === "accepted" ? (
            <form action={submitProviderTransition}>
              <input type="hidden" name="jobId" value={job.id} />
              <input type="hidden" name="next" value="complete" />
              <SubmitButton pendingLabel="Closing…">Mark complete</SubmitButton>
            </form>
          ) : null}
        </article>
      ))}
    </div>
  )
}

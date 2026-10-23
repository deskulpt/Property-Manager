"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  approveAgenticProposal,
  rejectAgenticProposal,
  runStubListingAutofill,
} from "@/lib/actions"
import type { AgenticProposal, AuditEntry, ListingDraft } from "@/lib/agentic/queue"
import type { PackageTier } from "@/lib/db"
import { packageHasAskEasy, subscribeHref } from "@/lib/plans"
import Link from "next/link"

export function AskDeskulptPanel({
  packageTier,
  proposals,
  audits,
  drafts,
}: {
  packageTier: PackageTier
  proposals: AgenticProposal[]
  audits: AuditEntry[]
  drafts: ListingDraft[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [prompt, setPrompt] = useState(
    "12,000 SF clear-span bay near Powai with 2 docks — draft a listing for P3",
  )

  if (!packageHasAskEasy(packageTier)) {
    return (
      <div className="border border-ink/10 bg-paper-2 p-4">
        <p className="font-sans text-lg font-extrabold">Ask Easy (Pro)</p>
        <p className="mt-2 text-sm text-ink-soft">
          Draft listings and propose desk actions with a human approval gate. Basic and Growth
          organisations see this upgrade path — switch to Nadia (BBM · Pro) in the Demo identity menu
          to try the stub agent, or upgrade below.
        </p>
        <Link
          href={subscribeHref("pro", { from: "ask-easy" })}
          className="mt-4 inline-block border border-terra/40 bg-terra/10 px-3 py-2 text-sm font-semibold text-terra hover:bg-terra/20"
        >
          Upgrade to Pro to unlock Ask Easy
        </Link>
      </div>
    )
  }

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, okMsg: string) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage(okMsg)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6">
      <section className="border border-ink/10 bg-card p-4">
        <h2 className="font-sans text-lg font-extrabold">Ask Easy</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Stub agent (Slice L.0) — deterministic drafts and tool proposals. No live LLM. Nothing
          mutates or notifies until you approve.
        </p>
        <label className="mt-4 block text-sm font-semibold" htmlFor="ask-prompt">
          Prompt
        </label>
        <textarea
          id="ask-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="mt-1 w-full border border-ink/15 bg-paper-2 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => runStubListingAutofill(prompt), "Draft listing proposed — review below.")}
          className="mt-3 bg-terra px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Working…" : "Stub autofill listing"}
        </button>
      </section>

      {error ? (
        <p className="border border-terra/40 bg-terra/10 px-3 py-2 text-sm">{error}</p>
      ) : null}
      {message ? (
        <p className="border border-avail/40 bg-avail/10 px-3 py-2 text-sm">{message}</p>
      ) : null}

      <section className="border border-ink/10 bg-card p-4">
        <h2 className="font-sans text-lg font-extrabold">Approval queue</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Approve runs the wrapped desk command. Reject leaves no job and no notify.
        </p>
        <ul className="mt-4 grid gap-3">
          {proposals.length === 0 ? (
            <li className="text-sm text-ink-soft">No proposals for this organisation.</li>
          ) : (
            proposals.map((item) => (
              <li key={item.id} className="border border-ink/10 bg-paper-2 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{item.title}</p>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    {item.payload.tool} · {item.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{item.summary}</p>
                <p className="mt-2 font-mono text-[11px] text-ink-faint">
                  Prompt · {item.promptSummary}
                </p>
                {item.outcome ? (
                  <p className="mt-1 font-mono text-[11px] text-ink-faint">Outcome · {item.outcome}</p>
                ) : null}
                {item.status === "proposed" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() => approveAgenticProposal(item.id), "Approved — command executed.")
                      }
                      className="bg-terra px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() => rejectAgenticProposal(item.id), "Rejected — no side effects.")
                      }
                      className="border border-ink/20 px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      {drafts.length > 0 ? (
        <section className="border border-ink/10 bg-card p-4">
          <h2 className="font-sans text-lg font-extrabold">Saved listing drafts</h2>
          <p className="mt-1 text-sm text-ink-soft">Draft only — publish is not wired in L.0.</p>
          <ul className="mt-4 grid gap-3">
            {drafts.map((draft, index) => (
              <li key={`${draft.unitCode}-${index}`} className="border border-ink/10 bg-paper-2 p-3 text-sm">
                <p className="font-semibold">
                  Unit {draft.unitCode} · {draft.sqft.toLocaleString("en-IN")} SF · ₹{draft.ratePsf}/SF
                </p>
                <p className="mt-1 text-ink-soft">{draft.description}</p>
                <span className="mt-2 inline-block font-mono text-[10px] uppercase tracking-wider text-pending">
                  {draft.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border border-ink/10 bg-card p-4">
        <h2 className="font-sans text-lg font-extrabold">Audit log</h2>
        <ul className="mt-3 grid gap-2">
          {audits.length === 0 ? (
            <li className="text-sm text-ink-soft">No audit rows yet — approve or reject a proposal.</li>
          ) : (
            audits.map((row) => (
              <li
                key={row.id}
                className="border border-ink/10 bg-paper-2 px-3 py-2 font-mono text-[11px] text-ink-soft"
              >
                {row.createdAt} · {row.approval} · {row.toolsProposed.join(",")} · {row.outcome}
                <br />
                prompt: {row.promptSummary}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}

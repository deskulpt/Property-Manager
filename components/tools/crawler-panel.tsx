"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  decideCrawlerMetaFixAction,
  runSeoCrawlerAction,
} from "@/lib/actions"
import type { CrawlerRun } from "@/lib/crawler"

export function CrawlerPanel({
  lastRun,
  mode,
}: {
  lastRun: CrawlerRun | null
  mode: "console" | "tools"
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function run(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    okMsg: string,
  ) {
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
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => runSeoCrawlerAction(), "Crawl finished — scores stored in SQLite.")}
          className="bg-brand px-4 py-2.5 text-sm font-semibold text-paper hover:bg-brand-deep disabled:opacity-60"
        >
          {pending ? "Running…" : "Run public crawl"}
        </button>
        <p className="text-sm text-ink-soft">
          {mode === "console"
            ? "Super-admin desk · scores SEO/a11y hints on marketing routes."
            : "Tools demo · same agent stub; meta publish still needs approval."}
        </p>
      </div>

      {error ? (
        <p className="border border-terra/40 bg-terra/10 px-3 py-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="border border-avail/40 bg-avail/10 px-3 py-2 text-sm" role="status">
          {message}
        </p>
      ) : null}

      {!lastRun ? (
        <p className="text-sm text-ink-soft">No crawl stored yet. Run one to seed SQLite.</p>
      ) : (
        <>
          <section aria-labelledby="crawl-summary">
            <h2 id="crawl-summary" className="font-serif text-xl font-semibold">
              Last run
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {lastRun.pageCount} pages · avg score{" "}
              <strong className="text-ink">{lastRun.avgScore}</strong> ·{" "}
              <span className="font-mono text-xs">{lastRun.finishedAt}</span>
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/15 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    <th className="py-2 pr-3">Path</th>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Score</th>
                    <th className="py-2">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {lastRun.pages.map((page) => (
                    <tr key={page.path} className="border-b border-ink/10 align-top">
                      <td className="py-2 pr-3 font-mono text-xs">{page.path}</td>
                      <td className="py-2 pr-3">{page.title}</td>
                      <td className="py-2 pr-3 font-semibold">{page.score}</td>
                      <td className="py-2 text-xs text-ink-soft">
                        {page.issues.map((issue) => issue.code).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="meta-fixes">
            <h2 id="meta-fixes" className="font-serif text-xl font-semibold">
              Meta fixes · approval gate
            </h2>
            <p className="mt-1 max-w-[56ch] text-sm text-ink-soft">
              Ask Easy–adjacent stub: approve before publish. Publish is demo-only (does not rewrite
              live route metadata files).
            </p>
            <ul className="mt-4 grid gap-3">
              {lastRun.proposals.map((proposal) => (
                <li
                  key={proposal.id}
                  className="border border-ink/10 bg-card p-4"
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    {proposal.path} · {proposal.field} · {proposal.status}
                  </p>
                  <p className="mt-2 text-sm">
                    <span className="text-ink-soft">Current:</span> {proposal.current}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="text-ink-soft">Proposed:</span>{" "}
                    <strong>{proposal.proposed}</strong>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {proposal.status === "proposed" ? (
                      <>
                        <button
                          type="button"
                          disabled={pending}
                          className="bg-brand px-3 py-1.5 text-xs font-semibold text-paper"
                          onClick={() =>
                            run(
                              () => decideCrawlerMetaFixAction(proposal.id, "approved"),
                              "Approved — publish when ready.",
                            )
                          }
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="border border-ink/20 px-3 py-1.5 text-xs font-semibold"
                          onClick={() =>
                            run(
                              () => decideCrawlerMetaFixAction(proposal.id, "rejected"),
                              "Rejected.",
                            )
                          }
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    {proposal.status === "approved" ? (
                      <button
                        type="button"
                        disabled={pending}
                        className="bg-terra px-3 py-1.5 text-xs font-semibold text-paper"
                        onClick={() =>
                          run(
                            () => decideCrawlerMetaFixAction(proposal.id, "published"),
                            "Published (demo marker).",
                          )
                        }
                      >
                        Publish meta fix
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

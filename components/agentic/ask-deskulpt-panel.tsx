import { DEMO_PROPOSALS } from "@/lib/agentic/queue"

export function AskDeskulptPanel({ tenantId }: { tenantId: string }) {
  const items = DEMO_PROPOSALS.filter((p) => p.tenantId === tenantId)
  return (
    <section className="border border-ink/10 bg-card p-4">
      <h2 className="font-sans text-lg font-extrabold">Ask DeSkulpt</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Approval queue stub — proposals never apply until you approve. No live LLM in this scaffold.
      </p>
      <ul className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <li className="text-sm text-ink-soft">No proposals for this organisation.</li>
        ) : (
          items.map((item) => (
            <li key={item.id} className="border border-ink/10 bg-paper-2 p-3">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{item.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled className="bg-terra/40 px-3 py-1.5 text-sm font-semibold text-white">
                  Approve (soon)
                </button>
                <button type="button" disabled className="border border-ink/20 px-3 py-1.5 text-sm">
                  Reject (soon)
                </button>
                <span className="self-center font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  {item.status}
                </span>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}

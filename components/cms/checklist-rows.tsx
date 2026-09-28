"use client"

import { submitChecklistItem } from "@/lib/actions"
import type { MarketChecklistItem } from "@/lib/db"

export function ChecklistRows({
  draftId,
  items,
  labels,
}: {
  draftId: string
  items: MarketChecklistItem[]
  labels: { save: string; markDone: string; markOpen: string }
}) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.key} className="bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-sans font-bold">{item.label}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                {item.key} · {item.done ? "done" : "open"}
              </p>
            </div>
            <form action={submitChecklistItem}>
              <input type="hidden" name="draftId" value={draftId} />
              <input type="hidden" name="itemKey" value={item.key} />
              <input type="hidden" name="notes" value={item.notes} />
              <input type="hidden" name="done" value={item.done ? "0" : "1"} />
              <button
                type="submit"
                className="border border-border px-3 py-1.5 text-sm font-bold"
              >
                {item.done ? labels.markOpen : labels.markDone}
              </button>
            </form>
          </div>
          <form action={submitChecklistItem} className="mt-3 grid gap-2">
            <input type="hidden" name="draftId" value={draftId} />
            <input type="hidden" name="itemKey" value={item.key} />
            <input type="hidden" name="done" value={item.done ? "1" : "0"} />
            <label className="grid gap-1 text-sm">
              Notes
              <textarea
                name="notes"
                defaultValue={item.notes}
                rows={2}
                className="border border-input bg-background px-2 py-1 text-sm"
                placeholder="Currency code, phone example, payment kinds…"
              />
            </label>
            <button type="submit" className="w-fit text-sm font-bold text-brand">
              {labels.save}
            </button>
          </form>
        </li>
      ))}
    </ul>
  )
}

"use client"

import { useState, useTransition } from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

type ChatRow = {
  role: "user" | "assistant"
  text: string
  meta?: string
}

/** Public catalog chat (Origin #13). Landlord desk uses `/landlord/ask` instead. */
export function AskChat({
  scope,
  propertyId,
  title,
  lede,
  placeholder,
}: {
  scope: "public" | "landlord"
  propertyId?: string
  title: string
  lede: string
  placeholder: string
}) {
  const [message, setMessage] = useState("")
  const [rows, setRows] = useState<ChatRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = message.trim()
    if (!text) return
    setError(null)
    setRows((prev) => [...prev, { role: "user", text }])
    setMessage("")
    startTransition(async () => {
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            scope,
            propertyId: propertyId || null,
          }),
        })
        const data = (await res.json()) as {
          reply?: string
          mode?: string
          grounded?: boolean
          error?: string
          toolCalls?: { name: string }[]
        }
        if (!res.ok) {
          setError(data.error ?? `Request failed (${res.status})`)
          return
        }
        const tools = data.toolCalls?.map((t) => t.name).join(", ")
        setRows((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.reply ?? "",
            meta: `${data.mode ?? "mock"}${data.grounded ? " · grounded" : ""}${tools ? ` · ${tools}` : ""}`,
          },
        ])
      } catch {
        setError("Network error talking to Ask.")
      }
    })
  }

  return (
    <div className="grid gap-4 border border-brand/10 bg-card p-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-brand-2)]">
          ADK · public
        </p>
        <h2 className="mt-1 font-heading text-xl font-extrabold">{title}</h2>
        <p className="mt-1 text-sm text-ink-soft">{lede}</p>
      </div>
      <div className="grid max-h-[420px] gap-3 overflow-y-auto" aria-live="polite">
        {rows.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No turns yet. Ask about available bays in the public catalog.
          </p>
        ) : (
          rows.map((row, i) => (
            <div
              key={`${row.role}-${i}`}
              className={
                row.role === "user"
                  ? "border-l-2 border-brand pl-3 text-sm"
                  : "whitespace-pre-wrap border-l-2 border-[var(--color-brand-2)] pl-3 text-sm"
              }
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                {row.role === "user" ? "You" : "Ask"}
                {row.meta ? ` · ${row.meta}` : ""}
              </p>
              <p className="mt-1">{row.text}</p>
            </div>
          ))
        )}
      </div>
      <form onSubmit={onSubmit} className="grid gap-2">
        <Label htmlFor="ask-message">Question</Label>
        <Textarea
          id="ask-message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={pending}
        />
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending || !message.trim()}>
          {pending ? "Thinking…" : "Ask"}
        </Button>
      </form>
    </div>
  )
}

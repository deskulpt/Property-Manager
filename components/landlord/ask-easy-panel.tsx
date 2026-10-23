"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/product"
import {
  decideAskEasyProposal,
  submitAskEasyPrompt,
  type AskEasyState,
} from "@/lib/actions"
import type { AgentAuditEvent, AgentProposal, AttributeCitation, ListingDraft } from "@/lib/agentic"
import {
  getVoiceSupport,
  speakText,
  startVoiceCapture,
} from "@/components/landlord/ask-easy-voice"

const promptInitial: AskEasyState = {
  error: null,
  message: null,
  fieldErrors: {},
  citations: [],
  toolName: null,
  reply: null,
}
const decideInitial: AskEasyState = {
  error: null,
  message: null,
  fieldErrors: {},
  citations: [],
  toolName: null,
  reply: null,
}

type ChatRow = {
  id: string
  role: "user" | "assistant" | "system"
  text: string
  citations?: AttributeCitation[]
  meta?: string
}

const STARTERS = [
  "Onboard me — summarise my portfolio",
  "List my buildings and floor-plan status",
  "What bays are available and at what rate?",
  "What fields can you read?",
  "Assign an electrician for the weather seal",
]

export function AskEasyPanel({
  gated,
  properties,
  pending,
  drafts,
  audit,
  modelMode,
  onboardSeed,
}: {
  gated: boolean
  properties: { id: string; name: string; units: { id: string; code: string }[] }[]
  pending: AgentProposal[]
  drafts: ListingDraft[]
  audit: AgentAuditEvent[]
  modelMode: "stub" | "live-ready"
  onboardSeed?: { reply: string; citations: AttributeCitation[]; toolName?: string | null }
}) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "")
  const property = properties.find((p) => p.id === propertyId) ?? properties[0]
  const [prompt, setPrompt] = useState("")
  const [rows, setRows] = useState<ChatRow[]>(() => {
    if (!onboardSeed?.reply) {
      return [
        {
          id: "sys-welcome",
          role: "system",
          text: "Ask Easy can read your buildings, bays, rates, amenities, floor plans, applications, and ledger summary — then propose mutations that wait for your Approve.",
        },
      ]
    }
    return [
      {
        id: "sys-welcome",
        role: "system",
        text: "Welcome back. Here is your live portfolio snapshot from the desk database.",
      },
      {
        id: "seed-asst",
        role: "assistant",
        text: onboardSeed.reply,
        citations: onboardSeed.citations,
        meta: onboardSeed.toolName ? `stub · ${onboardSeed.toolName}` : "stub · onboard",
      },
    ]
  })
  const [voiceStatus, setVoiceStatus] = useState<
    "idle" | "listening" | "unsupported" | "denied" | "error"
  >("idle")
  const [voiceDetail, setVoiceDetail] = useState<string | null>(null)
  const [ttsOn, setTtsOn] = useState(false)
  const [support] = useState(() => getVoiceSupport())
  const stopVoiceRef = useRef<(() => void) | null>(null)
  const stopSpeakRef = useRef<(() => void) | null>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const [pendingChat, startChat] = useTransition()
  const [decideState, decideAction] = useActionState(decideAskEasyProposal, decideInitial)

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" })
  }, [rows, pendingChat])

  useEffect(() => {
    return () => {
      stopVoiceRef.current?.()
      stopSpeakRef.current?.()
    }
  }, [])

  function appendAssistant(state: AskEasyState, userText: string) {
    const asstText = state.reply ?? state.message ?? state.error ?? "No reply."
    setRows((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text: userText },
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: asstText,
        citations: state.citations ?? [],
        meta: [
          state.toolName,
          modelMode === "live-ready" ? "live-ready" : "stub",
          state.error ? "error" : null,
        ]
          .filter(Boolean)
          .join(" · "),
      },
    ])
    if (ttsOn && !state.error && asstText) {
      stopSpeakRef.current?.()
      stopSpeakRef.current = speakText(asstText)
    }
  }

  function sendPrompt(text: string, opts?: { onboard?: boolean }) {
    const trimmed = text.trim()
    if (!trimmed && !opts?.onboard) return
    const body = new FormData()
    body.set("prompt", trimmed || "Onboard me")
    body.set("propertyId", propertyId)
    if (opts?.onboard) body.set("onboard", "1")
    const unitSelect = document.getElementById("unitId") as HTMLSelectElement | null
    if (unitSelect?.value) body.set("unitId", unitSelect.value)
    startChat(async () => {
      const state = await submitAskEasyPrompt(promptInitial, body)
      appendAssistant(state, trimmed || "Onboard me")
      setPrompt("")
    })
  }

  function toggleMic() {
    if (voiceStatus === "listening") {
      stopVoiceRef.current?.()
      stopVoiceRef.current = null
      setVoiceStatus("idle")
      return
    }
    if (!support.recognition) {
      setVoiceStatus("unsupported")
      setVoiceDetail("Voice input needs a browser with Web Speech (Chrome/Edge). You can still type.")
      return
    }
    stopVoiceRef.current = startVoiceCapture({
      onFinal: (transcript) => {
        setPrompt(transcript)
        setVoiceStatus("idle")
        sendPrompt(transcript)
      },
      onInterim: (t) => setPrompt(t),
      onStatus: (status, detail) => {
        setVoiceStatus(status)
        setVoiceDetail(detail ?? null)
      },
    })
  }

  if (gated) {
    return (
      <div className="relative overflow-hidden border border-brand/15 bg-gradient-to-br from-brand via-brand to-brand-deep p-8 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30 blueprint-grid-fine" aria-hidden />
        <p className="relative font-mono text-[11px] uppercase tracking-[0.18em] text-brand-3-light">
          Ask Easy · Pro+
        </p>
        <h2 className="relative mt-3 font-heading text-3xl font-extrabold tracking-tight">
          Upgrade to open Ask Easy
        </h2>
        <p className="relative mt-3 max-w-xl text-sm text-white/80">
          Text or voice onboarding that reads your real listing attributes, plus approval-gated
          concierge proposals. Basic plans see this gate.
        </p>
        <Link
          href="/landlord/settings"
          className="relative mt-6 inline-flex h-10 items-center bg-[var(--color-brand-2)] px-4 font-heading text-sm font-bold text-white transition-colors hover:bg-[var(--color-terra-dark)]"
        >
          Review package in Settings
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-6">
        <section
          className="relative overflow-hidden border border-brand/10 bg-card shadow-[inset_0_1px_0_rgb(14_110_140_/_0.12)]"
          aria-label="Ask Easy chat"
        >
          <div className="border-b border-brand/10 bg-gradient-to-r from-brand via-[#163049] to-[var(--color-brand-2)] px-4 py-4 text-white">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-3-light">
                  Easy Rental · Ask Easy
                </p>
                <h2 className="mt-1 font-heading text-2xl font-extrabold tracking-tight">
                  Onboard chat
                </h2>
                <p className="mt-1 max-w-xl text-sm text-white/75">
                  Text or voice. Answers cite real desk attributes. Publish, pay, lease, and notify
                  never auto-run.
                </p>
              </div>
              <span className="inline-flex border border-white/25 bg-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-brand-3-light">
                {modelMode === "live-ready" ? "Live model ready" : "Stub · offline OK"}
              </span>
            </div>
          </div>

          <div className="grid gap-3 border-b border-brand/10 bg-paper-2/60 px-4 py-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ask-property">Building context</Label>
              <select
                id="ask-property"
                className="h-9 border border-input bg-background px-2 text-sm"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unitId">Bay (optional)</Label>
              <select
                id="unitId"
                name="unitId"
                className="h-9 border border-input bg-background px-2 text-sm"
                defaultValue=""
              >
                <option value="">Auto-pick available</option>
                {property?.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unit {u.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            ref={transcriptRef}
            className="grid max-h-[min(52vh,480px)] gap-3 overflow-y-auto p-4"
            aria-live="polite"
          >
            {rows.map((row) => (
              <div
                key={row.id}
                className={
                  row.role === "user"
                    ? "border-l-4 border-brand bg-paper-2/80 pl-3 py-2"
                    : row.role === "system"
                      ? "border-l-4 border-[var(--color-brand-3)]/60 pl-3 py-2 text-sm text-ink-soft"
                      : "border-l-4 border-[var(--color-brand-2)] pl-3 py-2"
                }
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  {row.role === "user" ? "You" : row.role === "system" ? "Guide" : "Ask Easy"}
                  {row.meta ? ` · ${row.meta}` : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{row.text}</p>
                {row.citations && row.citations.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Cited attributes">
                    {row.citations.slice(0, 16).map((c, i) => (
                      <li
                        key={`${c.entity}-${c.field}-${c.entityId ?? i}`}
                        className="inline-flex max-w-full items-baseline gap-1 border border-brand/15 bg-paper px-2 py-0.5 font-mono text-[10px] text-ink-soft"
                        title={`${c.entity}.${c.field}`}
                      >
                        <span className="text-[var(--color-brand-2)]">{c.label}</span>
                        <span className="truncate text-ink">{c.value}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
            {pendingChat ? (
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                Reading desk…
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 border-t border-brand/10 p-4">
            <div className="flex flex-wrap gap-2" aria-label="Starter prompts">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="border border-brand/15 bg-paper px-2 py-1 text-left text-xs text-ink-soft transition-colors hover:border-[var(--color-brand-2)] hover:text-ink"
                  onClick={() => sendPrompt(s, { onboard: /onboard/i.test(s) })}
                  disabled={pendingChat}
                >
                  {s}
                </button>
              ))}
            </div>
            <Label htmlFor="prompt">Message</Label>
            <Textarea
              id="prompt"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[88px] border-brand/15 bg-paper focus-visible:ring-[var(--color-brand-2)]"
              placeholder="Ask about SF, rate, docks, floor plan, applications… or assign a trade"
              disabled={pendingChat}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendPrompt(prompt)
                }
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => sendPrompt(prompt)}
                disabled={pendingChat || !prompt.trim()}
                className="h-9 bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand/90 disabled:opacity-50"
              >
                {pendingChat ? "Sending…" : "Send"}
              </button>
              <button
                type="button"
                onClick={toggleMic}
                aria-pressed={voiceStatus === "listening"}
                aria-label={
                  voiceStatus === "listening" ? "Stop voice input" : "Start voice input"
                }
                className={`h-9 border px-3 text-sm font-bold transition-colors ${
                  voiceStatus === "listening"
                    ? "border-[var(--color-brand-3)] bg-[var(--color-brand-3)]/15 text-[var(--color-brand-3)]"
                    : "border-ink/20 bg-background hover:bg-muted"
                }`}
              >
                {voiceStatus === "listening" ? "Listening…" : "Mic"}
              </button>
              <label className="inline-flex items-center gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={ttsOn}
                  onChange={(e) => setTtsOn(e.target.checked)}
                  disabled={!support.synthesis}
                />
                Read replies aloud
              </label>
              {!support.recognition ? (
                <span className="font-mono text-[10px] text-ink-faint">
                  Mic unavailable — type instead
                </span>
              ) : null}
            </div>
            {voiceStatus === "denied" || voiceStatus === "unsupported" || voiceStatus === "error" ? (
              <p className="text-sm text-ink-soft" role="status">
                {voiceDetail ?? "Voice unavailable. Continue with text."}
              </p>
            ) : null}
          </div>
        </section>

        <section className="grid gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-heading text-xl font-extrabold">Approval queue</h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-brand-3)]">
              {pending.length} pending
            </span>
          </div>
          {pending.length === 0 ? (
            <EmptyState
              title="No pending proposals"
              body="Mutating tools (assign trade, publish, notify) wait here. Reject leaves no side effect."
            />
          ) : (
            <ul className="grid gap-3">
              {pending.map((item) => (
                <li
                  key={item.id}
                  className="border border-brand/10 border-l-4 border-l-[var(--color-brand-3)] bg-card p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex bg-[var(--color-brand-3)]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-brand-3)]">
                      Awaiting approval
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                      {item.toolName}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold">{item.promptSummary}</p>
                  <pre className="mt-2 max-h-40 overflow-auto bg-paper-2 p-2 font-mono text-[11px] text-ink-soft">
                    {JSON.stringify(item.payload, null, 2)}
                  </pre>
                  <form action={decideAction} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="proposalId" value={item.id} />
                    <button
                      type="submit"
                      name="decision"
                      value="approve"
                      className="h-8 bg-brand px-3 text-sm font-bold text-white transition-colors hover:bg-brand/90"
                    >
                      Approve
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="reject"
                      className="h-8 border border-ink/20 bg-background px-3 text-sm font-bold transition-colors hover:bg-muted"
                    >
                      Reject
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {decideState.error ? (
            <p className="text-sm text-destructive" role="alert">
              {decideState.error}
            </p>
          ) : null}
          {decideState.message ? (
            <p className="text-sm text-[var(--color-brand-2)]" role="status">
              {decideState.message}
            </p>
          ) : null}
        </section>

        <section className="grid gap-3">
          <h2 className="font-heading text-xl font-extrabold">Listing drafts</h2>
          {drafts.length === 0 ? (
            <p className="text-sm text-ink-soft">No drafts yet. Ask for listing copy to soft-fill one.</p>
          ) : (
            <ul className="grid gap-3">
              {drafts.map((draft) => (
                <li key={draft.id} className="border border-brand/10 bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-lg font-extrabold">{draft.title}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                      {draft.published ? "Published" : "Unpublished draft"}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-ink-faint">
                    Unit {draft.code} · ₹{draft.ratePsf}/SF · {draft.sqft.toLocaleString()} SF
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">{draft.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="border border-brand/10 bg-gradient-to-b from-card to-paper-2/80 p-4 md:sticky md:top-24 md:self-start">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-brand-2)]">
          Audit
        </p>
        <h3 className="mt-1 font-heading text-lg font-extrabold">Recent events</h3>
        {audit.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Prompt, read, and approve events land here.</p>
        ) : (
          <ol className="mt-3 grid gap-3">
            {audit.slice(0, 12).map((event) => (
              <li key={event.id} className="border-l-2 border-[var(--color-brand-2)]/50 pl-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  {event.kind}
                </p>
                <p className="text-sm">{event.summary}</p>
                <p className="font-mono text-[10px] text-ink-faint">
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 text-xs text-ink-faint">
          Hard rule: no provider notify, publish, pay, or lease without Approve. Voice uses Web
          Speech in-browser — Whisper/cloud STT is optional later.
        </p>
      </aside>
    </div>
  )
}

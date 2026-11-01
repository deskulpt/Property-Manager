"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react"
import { MessageCircle, Minus, Sparkles, X } from "lucide-react"
import {
  decideAskEasyProposal,
  submitAskEasyPrompt,
  type AskEasyState,
} from "@/lib/actions"
import type {
  AgentProposal,
  AttributeCitation,
  ListingDraft,
} from "@/lib/agentic"
import {
  askEasyBubbleBadgeCount,
  buildAskEasyCtaChips,
} from "@/lib/ask-easy/cta-chips"
import {
  readAskEasyIslandMode,
  writeAskEasyIslandMode,
  type AskEasyIslandMode,
} from "@/lib/ask-easy/island-prefs"
import { cn } from "@/lib/utils"

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

type TabId = "chat" | "approvals"

const STARTERS = [
  "Onboard me — summarise my portfolio",
  "What bays are available and at what rate?",
  "Assign an electrician for the weather seal",
]

export type AskEasyIslandProps = {
  gated: boolean
  properties: { id: string; name: string; units: { id: string; code: string }[] }[]
  pending: AgentProposal[]
  drafts: ListingDraft[]
  modelMode: "stub" | "live-ready"
  onboardSeed?: { reply: string; citations: AttributeCitation[]; toolName?: string | null }
}

export function AskEasyIsland(props: AskEasyIslandProps) {
  const { gated, properties, pending, drafts, modelMode, onboardSeed } = props
  const pathname = usePathname() || "/landlord"
  const searchParams = useSearchParams()
  const router = useRouter()
  const titleId = useId()
  const transcriptRef = useRef<HTMLDivElement>(null)

  const [mode, setMode] = useState<AskEasyIslandMode>("minimized")
  const [hydrated, setHydrated] = useState(false)
  const [tab, setTab] = useState<TabId>("chat")
  const [unread, setUnread] = useState(0)
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "")
  const [prompt, setPrompt] = useState("")
  const [rows, setRows] = useState<ChatRow[]>(() => seedRows(onboardSeed))
  const [pendingChat, startChat] = useTransition()
  const [decidePending, startDecide] = useTransition()
  const [decideMsg, setDecideMsg] = useState<string | null>(null)

  const badge = askEasyBubbleBadgeCount({
    pendingCount: pending.length,
    updateCount: unread,
  })

  const ctas = buildAskEasyCtaChips({
    gated,
    pendingCount: pending.length,
    draftCount: drafts.length,
    propertyCount: properties.length,
  })

  const persistMode = useCallback((next: AskEasyIslandMode) => {
    setMode(next)
    writeAskEasyIslandMode(
      typeof window !== "undefined" ? window.localStorage : null,
      next,
    )
    if (next === "open") setUnread(0)
  }, [])

  useEffect(() => {
    const stored = readAskEasyIslandMode(
      typeof window !== "undefined" ? window.localStorage : null,
    )
    const ask = searchParams.get("ask")
    const askTab = searchParams.get("askTab")
    if (ask === "open" || ask === "1") {
      persistMode("open")
      if (askTab === "approvals") setTab("approvals")
      // Clear query so refresh doesn't force-open after user minimizes
      const next = new URLSearchParams(searchParams.toString())
      next.delete("ask")
      next.delete("askTab")
      const q = next.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    } else {
      setMode(stored)
    }
    setHydrated(true)
  }, [pathname, persistMode, router, searchParams])

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [rows, pendingChat, mode, tab])

  useEffect(() => {
    if (mode !== "open") return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        persistMode("minimized")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mode, persistMode])

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
    if (mode === "minimized") setUnread((n) => n + 1)
  }

  function sendPrompt(text: string, opts?: { onboard?: boolean }) {
    const trimmed = text.trim()
    if (!trimmed && !opts?.onboard) return
    if (gated) return
    const body = new FormData()
    body.set("prompt", trimmed || "Onboard me")
    body.set("propertyId", propertyId)
    if (opts?.onboard) body.set("onboard", "1")
    startChat(async () => {
      const state = await submitAskEasyPrompt(promptInitial, body)
      appendAssistant(state, trimmed || "Onboard me")
      setPrompt("")
      if (state.toolName?.includes("propose") || /pending|approv/i.test(state.reply ?? "")) {
        setTab("approvals")
      }
    })
  }

  function onDecide(proposalId: string, decision: "approve" | "reject") {
    const body = new FormData()
    body.set("proposalId", proposalId)
    body.set("decision", decision)
    startDecide(async () => {
      const state = await decideAskEasyProposal(decideInitial, body)
      setDecideMsg(state.error ?? state.message)
      router.refresh()
    })
  }

  if (!hydrated) {
    return (
      <div
        className="ask-easy-island-anchor pointer-events-none fixed z-[60]"
        aria-hidden
        data-testid="ask-easy-island-ssr"
      />
    )
  }

  if (mode === "minimized") {
    return (
      <div className="ask-easy-island-anchor fixed z-[60]">
        <button
          type="button"
          className="btn btn-circle btn-primary ask-easy-bubble relative h-14 w-14 border-0 shadow-lg"
          data-testid="ask-easy-bubble"
          aria-label={
            badge > 0
              ? `Open Ask Easy, ${badge} updates`
              : "Open Ask Easy assistant"
          }
          onClick={() => persistMode("open")}
        >
          <MessageCircle className="h-6 w-6" aria-hidden />
          {badge > 0 ? (
            <span
              className="badge badge-accent badge-sm absolute -right-1 -top-1 border-0 font-mono"
              data-testid="ask-easy-bubble-badge"
            >
              {badge > 9 ? "9+" : badge}
            </span>
          ) : null}
        </button>
      </div>
    )
  }

  return (
    <div className="ask-easy-island-anchor fixed z-[60]">
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        data-testid="ask-easy-island"
        data-mode="open"
        className={cn(
          "ask-easy-island flex w-[min(100vw-1.25rem,24rem)] flex-col overflow-hidden",
          "rounded-box border border-base-300 bg-base-100 text-base-content shadow-2xl",
          "max-h-[min(78dvh,36rem)]",
        )}
      >
        <header className="flex items-start gap-2 border-b border-base-300 bg-primary px-3 py-3 text-primary-content">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary-content/80">
              Easy Rental · BYO assistant channel
            </p>
            <h2 id={titleId} className="mt-0.5 flex items-center gap-1.5 font-serif text-lg font-semibold">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden />
              Ask Easy
            </h2>
            <p className="mt-0.5 text-xs text-primary-content/75">
              {modelMode === "live-ready" ? "Live model ready" : "Stub · offline OK"}
              {" · "}
              never auto — Approve gates mutations
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square text-primary-content"
            data-testid="ask-easy-minimize"
            aria-label="Minimize Ask Easy"
            onClick={() => persistMode("minimized")}
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square text-primary-content lg:hidden"
            aria-label="Close Ask Easy"
            onClick={() => persistMode("minimized")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div
          className="flex flex-wrap gap-1.5 border-b border-base-300 bg-base-200/60 px-3 py-2"
          data-testid="ask-easy-cta-row"
          aria-label="Ask Easy shortcuts"
        >
          {ctas.map((chip) =>
            chip.id === "approvals" ? (
              <button
                key={chip.id}
                type="button"
                className="btn btn-warning btn-xs rounded-sm"
                data-testid={`ask-easy-cta-${chip.id}`}
                onClick={() => setTab("approvals")}
              >
                {chip.label}
              </button>
            ) : (
              <Link
                key={chip.id}
                href={chip.href}
                className={cn(
                  "btn btn-xs rounded-sm",
                  chip.tone === "accent" && "btn-accent",
                  (!chip.tone || chip.tone === "default") &&
                    "btn-ghost border border-base-300",
                )}
                data-testid={`ask-easy-cta-${chip.id}`}
              >
                {chip.label}
              </Link>
            ),
          )}
        </div>

        {gated ? (
          <div className="flex flex-1 flex-col gap-3 p-4" data-testid="ask-easy-gated">
            <p className="text-sm text-ink-soft">
              Soft Pro+ gate applies when package columns are enforced. Review your plan to open
              Ask Easy — API/MCP approval gates stay intact.
            </p>
            <Link href="/landlord/settings" className="btn btn-secondary btn-sm rounded-sm">
              Review package in Settings
            </Link>
          </div>
        ) : (
          <>
            <div role="tablist" className="tabs tabs-boxed mx-3 mt-2 rounded-sm bg-base-200 p-1">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "chat"}
                className={cn("tab tab-sm flex-1 rounded-sm", tab === "chat" && "tab-active")}
                data-testid="ask-easy-tab-chat"
                onClick={() => setTab("chat")}
              >
                Chat
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "approvals"}
                className={cn(
                  "tab tab-sm flex-1 rounded-sm",
                  tab === "approvals" && "tab-active",
                )}
                data-testid="ask-easy-tab-approvals"
                onClick={() => setTab("approvals")}
              >
                Approvals
                {pending.length > 0 ? (
                  <span className="badge badge-warning badge-xs ml-1">{pending.length}</span>
                ) : null}
              </button>
            </div>

            {tab === "chat" ? (
              <div className="flex min-h-0 flex-1 flex-col">
                {properties.length > 0 ? (
                  <label className="mx-3 mt-2 grid gap-1 text-xs">
                    <span className="font-mono uppercase tracking-wide text-ink-faint">
                      Building
                    </span>
                    <select
                      className="select select-bordered select-sm rounded-sm"
                      value={propertyId}
                      onChange={(e) => setPropertyId(e.target.value)}
                      aria-label="Building context"
                    >
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <div
                  ref={transcriptRef}
                  className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2"
                  aria-live="polite"
                  data-testid="ask-easy-island-thread"
                >
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className={cn(
                        "rounded-sm border-l-4 px-2 py-1.5 text-sm",
                        row.role === "user" && "border-primary bg-base-200/80",
                        row.role === "system" && "border-accent/60 text-ink-soft",
                        row.role === "assistant" && "border-secondary",
                      )}
                    >
                      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                        {row.role === "user"
                          ? "You"
                          : row.role === "system"
                            ? "Guide"
                            : "Ask Easy"}
                        {row.meta ? ` · ${row.meta}` : ""}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap">{row.text}</p>
                      {row.citations && row.citations.length > 0 ? (
                        <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Cited attributes">
                          {row.citations.slice(0, 8).map((c, i) => (
                            <li
                              key={`${c.entity}-${c.field}-${c.entityId ?? i}`}
                              className="badge badge-ghost badge-sm max-w-full truncate rounded-sm font-mono text-[10px]"
                            >
                              {c.label}: {c.value}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                  {pendingChat ? (
                    <p
                      className="font-mono text-[11px] uppercase tracking-wider text-ink-faint"
                      data-testid="ask-easy-status"
                    >
                      Reading desk…
                    </p>
                  ) : null}
                </div>

                <div className="border-t border-base-300 bg-base-100 p-3">
                  <div className="mb-2 flex flex-wrap gap-1" aria-label="Starter prompts">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="btn btn-ghost btn-xs rounded-sm border border-base-300"
                        disabled={pendingChat}
                        onClick={() => sendPrompt(s, { onboard: /onboard/i.test(s) })}
                      >
                        {s.length > 28 ? `${s.slice(0, 26)}…` : s}
                      </button>
                    ))}
                  </div>
                  <label className="sr-only" htmlFor="ask-easy-island-prompt">
                    Message
                  </label>
                  <textarea
                    id="ask-easy-island-prompt"
                    className="textarea textarea-bordered textarea-sm mb-2 min-h-[4.5rem] w-full rounded-sm"
                    value={prompt}
                    disabled={pendingChat}
                    placeholder="Ask about units, rates, jobs…"
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendPrompt(prompt)
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm w-full rounded-sm"
                    disabled={pendingChat || !prompt.trim()}
                    onClick={() => sendPrompt(prompt)}
                  >
                    {pendingChat ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3"
                data-testid="ask-easy-island-approvals"
              >
                {pending.length === 0 ? (
                  <p className="text-sm text-ink-soft">
                    No pending proposals. Mutating tools wait here — Reject leaves no side effect.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {pending.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-sm border border-base-300 border-l-4 border-l-warning bg-base-100 p-3"
                      >
                        <p className="font-mono text-[10px] uppercase tracking-wider text-warning">
                          {item.toolName}
                        </p>
                        <p className="mt-1 text-sm font-semibold">{item.promptSummary}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-primary btn-xs rounded-sm"
                            disabled={decidePending}
                            onClick={() => onDecide(item.id, "approve")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs rounded-sm border border-base-300"
                            disabled={decidePending}
                            onClick={() => onDecide(item.id, "reject")}
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {decideMsg ? (
                  <p className="text-sm text-secondary" role="status">
                    {decideMsg}
                  </p>
                ) : null}
                <p className="text-xs text-ink-faint">
                  Hard rule: no provider notify, publish, pay, or lease without Approve.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function seedRows(
  onboardSeed?: { reply: string; citations: AttributeCitation[]; toolName?: string | null },
): ChatRow[] {
  if (!onboardSeed?.reply) {
    return [
      {
        id: "sys-welcome",
        role: "system",
        text: "Ask Easy reads your buildings, bays, and ledger — then proposes mutations that wait for Approve. Use the chips to jump to listings, approvals, or units.",
      },
    ]
  }
  return [
    {
      id: "sys-welcome",
      role: "system",
      text: "Welcome back. Live portfolio snapshot from the desk database.",
    },
    {
      id: "seed-asst",
      role: "assistant",
      text: onboardSeed.reply,
      citations: onboardSeed.citations,
      meta: onboardSeed.toolName ? `stub · ${onboardSeed.toolName}` : "stub · onboard",
    },
  ]
}

"use client"

import { useEffect, useId, useRef, useState } from "react"
import gsap from "gsap"

export type NextStep = { title: string; body: string }
export type FaqItem = { q: string; a: string }

/**
 * Shared CMS chrome: three “What to do next” steps + FAQ accordion.
 * Optional GSAP highlight on first mount; skipped when reduced motion.
 */
export function DoNextFaq({
  steps,
  faqs,
  highlight = true,
}: {
  steps: [NextStep, NextStep, NextStep]
  faqs: FaqItem[]
  highlight?: boolean
}) {
  const root = useRef<HTMLDivElement>(null)
  const baseId = useId()
  const [open, setOpen] = useState<number | null>(0)

  useEffect(() => {
    if (!highlight) return
    const node = root.current
    if (!node) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = gsap.context(() => {
      gsap.from("[data-coach-step]", {
        y: 8,
        opacity: 0.35,
        duration: 0.4,
        stagger: 0.08,
        ease: "power2.out",
        clearProps: "opacity,transform",
      })
    }, node)
    return () => ctx.revert()
  }, [highlight])

  return (
    <div ref={root} className="mt-10 grid gap-8 border-t border-ink/10 pt-8">
      <section aria-labelledby={`${baseId}-next`} data-testid="do-this-next">
        <h2 id={`${baseId}-next`} className="font-serif text-xl font-semibold tracking-tight">
          What to do next
        </h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              data-coach-step
              className="border border-ink/10 bg-card px-4 py-3"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-terra">
                Step {index + 1}
              </p>
              <p className="mt-1 font-semibold text-ink">{step.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby={`${baseId}-faq`} data-testid="cms-faq">
        <h2 id={`${baseId}-faq`} className="font-serif text-xl font-semibold tracking-tight">
          FAQ
        </h2>
        <div className="mt-3 divide-y divide-ink/10 border border-ink/10 bg-card">
          {faqs.map((item, index) => {
            const panelId = `${baseId}-panel-${index}`
            const isOpen = open === index
            return (
              <div key={item.q}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-paper-2"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : index)}
                >
                  <span>{item.q}</span>
                  <span className="font-mono text-terra" aria-hidden>
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen ? (
                  <div id={panelId} className="px-4 pb-3 text-sm text-ink-soft">
                    {item.a}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

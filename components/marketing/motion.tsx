"use client"

import { useEffect, useRef } from "react"

/**
 * Soft entrance motion only — opacity (not autoAlpha) so elements stay clickable
 * if a scroll trigger never fires. Honours reduced motion.
 * GSAP loads lazily so the home route does not pay the full animation bundle on TTFB.
 */
export function Motion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = root.current
    if (!node) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let cancelled = false
    let revert: (() => void) | undefined

    ;(async () => {
      const gsapMod = await import("gsap")
      const { ScrollTrigger } = await import("gsap/ScrollTrigger")
      if (cancelled || !root.current) return
      const gsap = gsapMod.default
      gsap.registerPlugin(ScrollTrigger)
      const ctx = gsap.context(() => {
        gsap.from(".hero-brand, .hero-rise", {
          y: 12,
          opacity: 0,
          duration: 0.55,
          ease: "power2.out",
          stagger: 0.06,
          clearProps: "opacity,transform",
        })
        gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
          gsap.from(el, {
            y: 16,
            opacity: 0,
            duration: 0.5,
            ease: "power2.out",
            clearProps: "opacity,transform",
            scrollTrigger: {
              trigger: el,
              start: "top 90%",
              once: true,
            },
          })
        })
      }, node)
      revert = () => ctx.revert()
    })()

    return () => {
      cancelled = true
      revert?.()
    }
  }, [])

  return <div ref={root} className="[&_a]:pointer-events-auto [&_button]:pointer-events-auto">{children}</div>
}

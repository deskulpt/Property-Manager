"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

/** Three intentional motions: brand settle, hero rise, scroll reveals. Honours reduced motion. */
export function Motion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = root.current
    if (!node) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.from(".hero-brand", {
        y: 36,
        autoAlpha: 0,
        duration: 1,
        ease: "power3.out",
      })
      gsap.from(".hero-rise", {
        y: 22,
        autoAlpha: 0,
        duration: 0.75,
        ease: "power2.out",
        stagger: 0.1,
        delay: 0.15,
      })
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.from(el, {
          y: 28,
          autoAlpha: 0,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        })
      })
    }, node)
    return () => ctx.revert()
  }, [])

  return <div ref={root}>{children}</div>
}

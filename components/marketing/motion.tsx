"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export function Motion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = root.current
    if (!node) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.from(el, {
          y: 26,
          autoAlpha: 0,
          duration: 0.75,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        })
      })
      gsap.from(".hero-rise", {
        y: 24,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power2.out",
        stagger: 0.08,
      })
    }, node)
    return () => ctx.revert()
  }, [])

  return <div ref={root}>{children}</div>
}

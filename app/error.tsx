"use client"

import { Button } from "@/components/ui/button"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">Something broke</p>
      <h1 className="mt-3 text-3xl font-black">This page did not load.</h1>
      <p className="mt-3 text-ink-soft">
        The desk hit an error. Try again. If you just switched demo identities, go back to the portfolio and re-enter.
      </p>
      <Button className="mt-6" type="button" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  )
}

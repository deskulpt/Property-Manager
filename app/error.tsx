"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Error({
  reset,
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">Something broke</p>
      <h1 className="mt-3 text-3xl font-black">This page did not load.</h1>
      <p className="mt-3 text-ink-soft">
        Try again. If you were using the demo identity switcher, return home and re-select your role. No
        internal stack traces are shown here.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[11px] text-ink-faint">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Link
          href="/"
          className="inline-flex h-8 items-center border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
        >
          Home
        </Link>
      </div>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { downloadMyData, requestAccountErasure } from "@/lib/actions"
import { Button } from "@/components/ui/button"

type Props = {
  role: string
}

export function DataRightsPanel({ role }: Props) {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <section className="bg-card p-4 ring-1 ring-foreground/10 md:p-6">
      <h2 className="font-sans text-lg font-extrabold">Your data (DPDP)</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Export a JSON copy of your account rows, or request erasure of personal fields. See the{" "}
        <a href="/legal/privacy" className="font-semibold text-terra hover:underline">
          Privacy Policy
        </a>
        .
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const result = await downloadMyData()
              if (!result.ok) {
                setMessage(result.error)
                return
              }
              const blob = new Blob([JSON.stringify(result.payload, null, 2)], {
                type: "application/json",
              })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `easy-rental-export-${new Date().toISOString().slice(0, 10)}.json`
              a.click()
              URL.revokeObjectURL(url)
              setMessage("Export downloaded. A consent event was recorded.")
            })
          }}
        >
          Download my data
        </Button>
        {role === "applicant" ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (
                !window.confirm(
                  "Redact your name, email, phone, and verification rows? Ledger history stays for the landlord.",
                )
              ) {
                return
              }
              start(async () => {
                const result = await requestAccountErasure()
                if (!result.ok) {
                  setMessage(result.error)
                  return
                }
                setMessage("Personal fields redacted. Sign out and refresh.")
              })
            }}
          >
            Request erasure
          </Button>
        ) : (
          <p className="text-sm text-ink-soft">
            Organisation account erasure is handled by support (keeps ledger integrity). Contact the operator.
          </p>
        )}
      </div>
      {message ? (
        <p className="mt-3 text-sm text-brand" role="status">
          {message}
        </p>
      ) : null}
    </section>
  )
}

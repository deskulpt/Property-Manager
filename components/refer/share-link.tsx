"use client"

import { useState } from "react"
import { whatsappShareUrl } from "@/lib/referrals"

export function ShareReferralLink({
  absoluteUrl,
  shortPath,
}: {
  absoluteUrl: string
  shortPath: string
}) {
  const [copied, setCopied] = useState(false)
  const wa = whatsappShareUrl(
    absoluteUrl,
    `Refer warehouses and yards on Easy Rental — proposed rewards when published or leased. ${absoluteUrl}`,
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(absoluteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="border border-ink/15 bg-card p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">Your link</p>
      <p className="mt-2 break-all font-mono text-sm text-ink">{absoluteUrl}</p>
      <p className="mt-1 text-xs text-ink-faint">Also works as {shortPath} · first-touch cookie 90 days</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="bg-brand px-4 py-2 text-sm font-semibold text-paper hover:bg-brand-deep"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-ink/25 px-4 py-2 text-sm font-semibold text-ink hover:border-terra hover:text-terra"
        >
          Share on WhatsApp
        </a>
      </div>
    </div>
  )
}

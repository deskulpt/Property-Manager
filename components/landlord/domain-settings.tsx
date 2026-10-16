"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  addLandlordDomain,
  checkLandlordDomainDns,
  removeLandlordDomain,
} from "@/lib/actions"
import type { CustomDomainRecord } from "@/lib/db"
import type { PackageTier } from "@/lib/db"
import { SubmitButton } from "@/components/submit-button"

export function DomainSettings({
  packageTier,
  domains,
}: {
  packageTier: PackageTier
  domains: CustomDomainRecord[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(domains[0]?.id ?? null)
  const active = domains.find((d) => d.id === activeId) ?? domains[0] ?? null

  if (packageTier !== "pro") {
    return (
      <div className="border border-ink/10 bg-paper-2 p-4">
        <p className="font-sans text-lg font-extrabold">Custom domain (PRO)</p>
        <p className="mt-2 text-sm text-ink-soft">
          Serve public listings on your own hostname (for example{" "}
          <span className="font-mono text-ink">listings.yourcompany.com</span>). Starter organisations
          see this upgrade path; switch to Nadia (BBM · PRO) in the Demo identity menu to try the
          full connect flow, or ask platform staff to move you to PRO.
        </p>
        <p className="mt-4 inline-block border border-terra/40 bg-terra/10 px-3 py-2 text-sm font-semibold text-terra">
          Upgrade to PRO to unlock custom domains
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="font-sans text-lg font-extrabold">Custom domain (PRO)</p>
        <p className="mt-1 text-sm text-ink-soft">
          When a domain is active, prospects can open your listings on that hostname. DeSkulpt does
          not host Matterport files — only your listing app. DNS is verified in this demo without a
          live nameserver call unless you paste the TXT value.
        </p>
      </div>

      {message ? (
        <p className="border border-avail/40 bg-avail/10 px-3 py-2 text-sm">{message}</p>
      ) : null}
      {error ? (
        <p className="border border-terra/40 bg-terra/10 px-3 py-2 text-sm">{error}</p>
      ) : null}

      <ol className="grid gap-3 border border-ink/10 bg-paper-2 p-4 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
        <li>1 · Enter hostname</li>
        <li>2 · Add CNAME + TXT at your DNS host</li>
        <li>3 · Check DNS (demo marks verified)</li>
        <li>4 · Listings open on your domain when status is active</li>
      </ol>

      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          setMessage(null)
          setError(null)
          startTransition(async () => {
            const result = await addLandlordDomain(data)
            if (!result.ok) {
              setError(result.error)
              return
            }
            setMessage(`Added ${result.hostname}. Continue with DNS records below.`)
            setActiveId(result.id)
            event.currentTarget.reset()
            router.refresh()
          })
        }}
      >
        <label className="grid gap-1 text-sm sm:col-span-1">
          <span className="font-medium">Hostname</span>
          <input
            name="hostname"
            required
            placeholder="listings.yourcompany.com"
            className="h-10 border border-ink/20 bg-card px-3"
          />
        </label>
        <SubmitButton className="h-10 bg-brand px-4 text-sm font-semibold text-paper">
          Add domain
        </SubmitButton>
      </form>

      {domains.length === 0 ? (
        <p className="text-sm text-ink-soft">No custom domains yet.</p>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {domains.map((domain) => (
              <button
                key={domain.id}
                type="button"
                onClick={() => setActiveId(domain.id)}
                className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider ${
                  active?.id === domain.id
                    ? "border-terra bg-terra/10 text-terra"
                    : "border-ink/15 text-ink-soft"
                }`}
              >
                {domain.hostname} · {domain.status}
              </button>
            ))}
          </div>

          {active ? (
            <div className="grid gap-4 border border-ink/10 bg-card p-4">
              <p className="text-sm">
                Status:{" "}
                <span className="font-semibold uppercase tracking-wide">{active.status}</span>
                {active.status === "active" ? (
                  <span className="mt-1 block text-ink-soft">
                    Listings can be opened on{" "}
                    <span className="font-mono text-ink">https://{active.hostname}</span> when this
                    host points at DeSkulpt (demo: documented target below).
                  </span>
                ) : null}
              </p>

              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  Manual DNS records
                </p>
                <table className="mt-2 w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Name / host</th>
                      <th className="py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    <tr className="border-b border-ink/5">
                      <td className="py-2 pr-3">CNAME</td>
                      <td className="py-2 pr-3">{active.hostname}</td>
                      <td className="py-2 break-all">cname.deskulpt.example</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3">TXT</td>
                      <td className="py-2 pr-3">_deskulpt.{active.hostname}</td>
                      <td className="py-2 break-all">{active.txtToken}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  const data = new FormData(event.currentTarget)
                  data.set("domainId", active.id)
                  setMessage(null)
                  setError(null)
                  startTransition(async () => {
                    const result = await checkLandlordDomainDns(data)
                    if (!result.ok) {
                      setError(result.error)
                      return
                    }
                    setMessage(
                      result.status === "active"
                        ? `${result.hostname} is active. Listings may open on that hostname.`
                        : `Checked ${result.hostname}.`,
                    )
                    router.refresh()
                  })
                }}
              >
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Optional: paste observed TXT (guided)</span>
                  <input
                    name="observedTxt"
                    placeholder={active.txtToken}
                    className="h-10 border border-ink/20 bg-card px-3 font-mono text-xs"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" name="demoForce" value="1" defaultChecked />
                  Demo: Check DNS without a live nameserver lookup
                </label>
                <div className="flex flex-wrap gap-2">
                  <SubmitButton
                    className="h-10 bg-terra px-4 text-sm font-semibold text-white"
                  >
                    Check DNS
                  </SubmitButton>
                  <button
                    type="button"
                    disabled={pending}
                    className="h-10 border border-ink/20 px-4 text-sm"
                    onClick={() => {
                      setMessage(null)
                      setError(null)
                      startTransition(async () => {
                        const data = new FormData()
                        data.set("domainId", active.id)
                        const result = await removeLandlordDomain(data)
                        if (!result.ok) {
                          setError(result.error)
                          return
                        }
                        setMessage("Domain removed.")
                        setActiveId(null)
                        router.refresh()
                      })
                    }}
                  >
                    Remove
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

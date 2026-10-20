"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { completeVerification } from "@/lib/actions"

/**
 * Demo KYC wizard. Does not accept Aadhaar/document image uploads.
 * India uses a simulated licensed-provider reference id (no UIDAI call, no image bytes).
 */
export function VerificationWizard({
  existing,
  countries,
}: {
  existing: {
    country: string
    region: string
    docType: string
    score: number
    result: string
    createdAt: string
  } | null
  countries: { iso: string; name: string; live: boolean }[]
}) {
  const countryOptions = countries.map((country) => ({
    value: country.name,
    label: country.live ? `${country.name} (live)` : country.name,
  }))
  const defaultCountry =
    existing && countries.some((c) => c.name === existing.country)
      ? existing.country
      : countries[0]?.name ?? "India"

  const [step, setStep] = useState(0)
  const [country, setCountry] = useState<string>(defaultCountry)
  const [region, setRegion] = useState(existing?.region ?? "")
  const [providerRef, setProviderRef] = useState("")
  const [consent, setConsent] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<{ score: number; result: string } | null>(
    existing ? { score: existing.score, result: existing.result } : null,
  )

  const isIndia = country === "India" || country === "IN"
  const docType = isIndia ? "aadhaar" : "driving_licence"
  const docLabel = docType === "aadhaar" ? "Aadhaar (via licensed KYC provider)" : "Driving licence (reference)"
  const steps = ["Country", "Document", "Provider ref", "Result"]

  async function finish() {
    setError(null)
    if (!consent) {
      setError("Confirm you consent to a simulated KYC check.")
      return
    }
    if (!providerRef.trim()) {
      setError("Enter a demo provider reference (e.g. IDFY-DEMO-001).")
      return
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!reduce) {
      setScanning(true)
      await new Promise((resolve) => setTimeout(resolve, 900))
      setScanning(false)
    }
    const result = await completeVerification(
      { error: null, result: null },
      {
        country,
        region,
        docType,
        fileName: providerRef.trim(),
        faceName: "provider-hosted",
      },
    )
    if (result.error) setError(result.error)
    setOutcome(result.result)
    setStep(3)
  }

  const offered = useMemo(() => countryOptions, [countryOptions])

  return (
    <div className="grid gap-6">
      <div className="border border-terra/40 bg-terra/10 px-4 py-3 text-sm">
        <p className="font-sans font-bold">Demo verification · no document images</p>
        <p className="mt-1 text-ink-soft">
          Easy Rental does not collect or store Aadhaar photos. India uses a simulated licensed-provider
          reference (IDfy / Signzy / HyperVerge style). Nothing is sent to UIDAI.
        </p>
      </div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((label, index) => (
          <li key={label} className={`border px-3 py-2 font-mono text-[11px] uppercase tracking-wider ${index === step ? "border-brand bg-accent text-brand" : "border-border text-ink-faint"}`}>
            0{index + 1} {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="grid gap-4 bg-card p-5 ring-1 ring-foreground/10">
          <div className="grid gap-2">
            <Label htmlFor="verify-country">Country</Label>
            <select
              id="verify-country"
              data-testid="verify-country"
              className="h-9 w-full border border-input bg-background px-2 text-sm"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              {offered.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="region">State / province / region</Label>
            <Input id="region" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Telangana" />
          </div>
          <Button type="button" onClick={() => setStep(1)} disabled={!region.trim()}>
            Continue
          </Button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4 bg-card p-5 ring-1 ring-foreground/10">
          <p className="text-sm text-ink-soft">
            Document for {country}: <span className="font-bold text-ink">{docLabel}</span>
          </p>
          <p className="text-sm text-ink-soft">
            Production will redirect to a licensed KYC vendor. This demo only records a provider reference id.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button type="button" onClick={() => setStep(2)}>Continue</Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 bg-card p-5 ring-1 ring-foreground/10">
          <div className="grid gap-2">
            <Label htmlFor="provider-ref">Provider verification reference</Label>
            <Input
              id="provider-ref"
              data-testid="verify-provider-ref"
              value={providerRef}
              onChange={(event) => setProviderRef(event.target.value)}
              placeholder="IDFY-DEMO-001"
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            I consent to a simulated identity check. No Aadhaar image or biometric template will be stored.
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button type="button" onClick={() => void finish()} disabled={scanning}>
              {scanning ? "Matching…" : "Run demo match"}
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      ) : null}

      {step === 3 && outcome ? (
        <div className="grid gap-3 bg-card p-5 ring-1 ring-foreground/10">
          <p className="font-sans text-2xl font-black text-brand">
            {outcome.result} · {outcome.score.toFixed(2)}
          </p>
          <p className="text-sm text-ink-soft">Simulated only. No government API was called and no ID image was stored.</p>
          <Button type="button" variant="outline" onClick={() => setStep(0)}>Run again</Button>
        </div>
      ) : null}
    </div>
  )
}

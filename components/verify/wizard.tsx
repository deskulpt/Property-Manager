"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { completeVerification } from "@/lib/actions"

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
  const [fileName, setFileName] = useState("")
  const [faceName, setFaceName] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<{ score: number; result: string } | null>(
    existing ? { score: existing.score, result: existing.result } : null,
  )

  const isIndia = country === "India" || country === "IN"
  const docType = isIndia ? "aadhaar" : "driving_licence"
  const docLabel = docType === "aadhaar" ? "Aadhaar" : "Driving licence"
  const steps = ["Country", "Document", "Upload", "Face match"]

  function rememberFile(file: File | undefined, kind: "doc" | "face") {
    if (!file) return
    if (kind === "doc") setFileName(file.name)
    else {
      setFaceName(file.name)
      const url = URL.createObjectURL(file)
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    }
  }

  async function finish(nextFace = faceName) {
    setError(null)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!reduce) {
      setScanning(true)
      await new Promise((resolve) => setTimeout(resolve, 900))
      setScanning(false)
    }
    const result = await completeVerification(
      { error: null, result: null },
      { country, region, docType, fileName, faceName: nextFace },
    )
    if (result.error) setError(result.error)
    setOutcome(result.result)
    setStep(3)
  }

  const offered = useMemo(() => countryOptions, [countryOptions])

  return (
    <div className="grid gap-6">
      <div className="border border-terra/40 bg-terra/10 px-4 py-3 text-sm">
        <p className="font-sans font-bold">Demo verification</p>
        <p className="mt-1 text-ink-soft">
          Nothing is sent to UIDAI or any government API. Only India and checklist-ready draft markets are offered. Incomplete drafts stay off this form.
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
            <Input id="region" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Maharashtra" />
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
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button type="button" onClick={() => setStep(2)}>Continue</Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 bg-card p-5 ring-1 ring-foreground/10">
          <label className="grid gap-1 text-sm">
            Document file (filename only)
            <input type="file" accept="image/*,.pdf" onChange={(event) => rememberFile(event.target.files?.[0], "doc")} />
            {fileName ? <span className="text-xs text-ink-soft">{fileName}</span> : null}
          </label>
          <label className="grid gap-1 text-sm">
            Face photo (filename only)
            <input type="file" accept="image/*" onChange={(event) => rememberFile(event.target.files?.[0], "face")} />
            {faceName ? <span className="text-xs text-ink-soft">{faceName}</span> : null}
          </label>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="max-h-40 w-auto object-contain" />
          ) : null}
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
          <p className="text-sm text-ink-soft">Simulated only. No government API was called.</p>
          <Button type="button" variant="outline" onClick={() => setStep(0)}>Run again</Button>
        </div>
      ) : null}
    </div>
  )
}

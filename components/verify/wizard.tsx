"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { completeVerification } from "@/lib/actions"

const COUNTRIES = ["India", "United Kingdom", "United States", "Canada"] as const
const countries = COUNTRIES.map((country) => ({ value: country, label: country }))

export function VerificationWizard({
  existing,
}: {
  existing: {
    country: string
    region: string
    docType: string
    score: number
    result: string
    createdAt: string
  } | null
}) {
  const [step, setStep] = useState(0)
  const [country, setCountry] = useState<string>(existing?.country ?? "India")
  const [region, setRegion] = useState(existing?.region ?? "")
  const [fileName, setFileName] = useState("")
  const [faceName, setFaceName] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<{ score: number; result: string } | null>(
    existing ? { score: existing.score, result: existing.result } : null,
  )

  const docType = country === "India" ? "aadhaar" : "driving_licence"
  const docLabel = docType === "aadhaar" ? "Aadhaar" : "Driving licence"
  const steps = ["Country", "Document", "Upload", "Face match"]
  const regionItems = useMemo(() => [{ value: region || " ", label: region || "Type a region below" }], [region])

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

  return (
    <div className="grid gap-6">
      <div className="border border-terra/40 bg-terra/10 px-4 py-3 text-sm">
        <p className="font-sans font-bold">Demo verification</p>
        <p className="mt-1 text-ink-soft">
          Nothing is sent to UIDAI or any government API. Uploaded files are discarded after the filename is read. No biometric template is stored. The match score is simulated.
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
            <Label>Country</Label>
            <Select items={countries} value={country} onValueChange={(value) => value && setCountry(String(value))}>
              <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {countries.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="region">{country === "India" ? "State" : "Province or state"}</Label>
            <Input id="region" value={region} onChange={(event) => setRegion(event.target.value)} placeholder={country === "Canada" ? "Ontario" : "Region"} />
          </div>
          <p className="text-sm text-ink-soft">
            Document for this country: <strong className="font-sans">{docLabel}</strong>.
            {country === "India" ? " Aadhaar is the demo document type. It is not checked with UIDAI." : " A provincial or state driving licence is the demo document type."}
          </p>
          <Button type="button" disabled={region.trim().length < 2} onClick={() => setStep(1)}>Continue</Button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4 bg-card p-5 ring-1 ring-foreground/10">
          <p className="font-sans text-xl font-extrabold">{docLabel}</p>
          <p className="text-ink-soft">
            {country}, {region}. This step only confirms the document type. It does not read a chip or call a registry.
          </p>
          <Select items={regionItems} value={docType} disabled>
            <SelectTrigger className="w-full"><SelectValue>{docLabel}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value={docType}>{docLabel}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button type="button" onClick={() => setStep(2)}>Continue</Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 bg-card p-5 ring-1 ring-foreground/10">
          <Label htmlFor="doc">Upload a sample file</Label>
          <Input id="doc" type="file" accept="image/*,.pdf" onChange={(event) => rememberFile(event.target.files?.[0], "doc")} />
          <p className="text-sm text-ink-soft">
            {fileName ? `Filename noted: ${fileName}. The bytes are not saved.` : "Or skip the real file and use a demo name."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button type="button" variant="secondary" onClick={() => { setFileName(docType === "aadhaar" ? "demo-aadhaar.pdf" : "demo-licence.pdf"); setStep(3) }}>
              Use a demo document
            </Button>
            <Button type="button" disabled={!fileName} onClick={() => setStep(3)}>Continue</Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-4 bg-card p-5 ring-1 ring-foreground/10">
          <div className="relative mx-auto grid h-64 w-full max-w-sm place-items-center overflow-hidden bg-brand-deep">
            <div className="h-44 w-32 rounded-[50%] border-2 border-dashed border-paper/70" />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Local preview only. Not stored." className="absolute inset-0 h-full w-full object-cover opacity-80" />
            ) : null}
            {scanning ? <div className="absolute inset-x-6 h-0.5 animate-pulse bg-terra" /> : null}
            <p className="absolute bottom-3 font-mono text-[10px] uppercase tracking-widest text-paper">Align a face · preview stays in the browser</p>
          </div>
          <Label htmlFor="face">Optional face image</Label>
          <Input id="face" type="file" accept="image/*" onChange={(event) => rememberFile(event.target.files?.[0], "face")} />
          {outcome ? (
            <div className="border border-brand/30 bg-accent px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-brand">Simulated result · demo only</p>
              <p className="mt-1 font-sans text-2xl font-black">{outcome.result} · {outcome.score.toFixed(2)}</p>
              <p className="mt-1 text-sm text-ink-soft">Not a government identity decision. No template was written to the database.</p>
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const name = "demo-face.jpg"
                setFaceName(name)
                void finish(name)
              }}
            >
              Use demo capture
            </Button>
            <Button type="button" disabled={!faceName || scanning} onClick={() => void finish()}>
              {scanning ? "Matching…" : "Run demo match"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

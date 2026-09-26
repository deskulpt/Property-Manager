"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { submitRequestOtp, submitVerifyOtp, type OtpState } from "@/lib/actions"
import { PHONE_COUNTRY_CODES, formatPhoneDisplay } from "@/lib/market"

const initial: OtpState = {
  error: null,
  message: null,
  demoCode: null,
  phoneE164: null,
  verified: false,
}

export function PhoneOtpForm({
  currentPhone,
}: {
  currentPhone: string | null
}) {
  const router = useRouter()
  const [requestState, requestAction] = useActionState(submitRequestOtp, initial)
  const [verifyState, verifyAction] = useActionState(submitVerifyOtp, initial)
  const [countryCode, setCountryCode] = useState("+91")
  const [onFile, setOnFile] = useState(currentPhone)
  const meta = PHONE_COUNTRY_CODES.find((item) => item.code === countryCode)

  useEffect(() => {
    setOnFile(currentPhone)
  }, [currentPhone])

  useEffect(() => {
    if (verifyState.verified && verifyState.phoneE164) {
      setOnFile(verifyState.phoneE164)
      router.refresh()
    }
  }, [verifyState, router])

  const error = verifyState.error || requestState.error
  const message = verifyState.verified
    ? verifyState.message
    : requestState.message && !verifyState.verified
      ? requestState.message
      : verifyState.message

  return (
    <div className="grid gap-4">
      {onFile ? (
        <p className="border border-brand/25 bg-accent px-3 py-2 text-sm text-brand" role="status" data-testid="otp-on-file">
          Verified on file: <span className="font-bold">{formatPhoneDisplay(onFile)}</span>
        </p>
      ) : (
        <p className="text-sm text-ink-soft">No phone on file yet. International numbers are welcome.</p>
      )}

      <form action={requestAction} className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_1fr_auto]">
        <div className="grid gap-1">
          <Label htmlFor="countryCode">Country code</Label>
          <select
            id="countryCode"
            name="countryCode"
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            className="h-9 w-full border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PHONE_COUNTRY_CODES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="national">Mobile number</Label>
          <Input
            id="national"
            name="national"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder={meta ? `${meta.nationalLength} digits` : "National number"}
            maxLength={meta?.nationalLength ?? 14}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full sm:w-auto">
            Send demo OTP
          </Button>
        </div>
      </form>

      {requestState.demoCode ? (
        <div className="border border-terra/40 bg-terra/10 px-4 py-3 text-sm" data-testid="otp-demo-code">
          <p className="font-bold">Demo OTP for {requestState.phoneE164}</p>
          <p className="mt-1 font-mono text-2xl tracking-[0.3em] text-brand">{requestState.demoCode}</p>
          <p className="mt-1 text-xs text-ink-soft">No SMS provider. The code is always shown here in this demo.</p>
        </div>
      ) : null}

      <form action={verifyAction} className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-[10rem] flex-1 gap-1">
          <Label htmlFor="otp-code">OTP code</Label>
          <Input id="otp-code" name="code" inputMode="numeric" maxLength={6} placeholder="246810" />
        </div>
        <Button type="submit" variant="outline">
          Verify
        </Button>
      </form>

      {error ? (
        <p className="text-sm text-destructive" role="alert" data-testid="otp-error">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm font-bold text-brand" role="status" data-testid="otp-message">
          {message}
        </p>
      ) : null}
      {verifyState.verified ? (
        <p className="border border-avail/40 bg-avail/10 px-3 py-2 text-sm font-bold text-avail" data-testid="otp-verified">
          OTP verified for {verifyState.phoneE164}
        </p>
      ) : null}
    </div>
  )
}

"use client"

import { useActionState, useState } from "react"
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
  const [requestState, requestAction] = useActionState(submitRequestOtp, initial)
  const [verifyState, verifyAction] = useActionState(submitVerifyOtp, initial)
  const [countryCode, setCountryCode] = useState("+91")
  const codes = PHONE_COUNTRY_CODES.map((item) => ({
    value: item.code,
    label: item.label,
  }))
  const meta = PHONE_COUNTRY_CODES.find((item) => item.code === countryCode)
  const state = verifyState.verified ? verifyState : requestState.error || requestState.message ? requestState : verifyState

  return (
    <div className="grid gap-4">
      {currentPhone ? (
        <p className="text-sm text-ink-soft">
          On file: <span className="font-bold text-ink">{formatPhoneDisplay(currentPhone)}</span>
        </p>
      ) : (
        <p className="text-sm text-ink-soft">No phone on file yet. International numbers are welcome.</p>
      )}

      <form action={requestAction} className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_1fr_auto]">
        <div className="grid gap-1">
          <Label>Country code</Label>
          <input type="hidden" name="countryCode" value={countryCode} />
          <Select
            items={codes}
            value={countryCode}
            onValueChange={(value) => value && setCountryCode(String(value))}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {codes.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="border border-terra/40 bg-terra/10 px-4 py-3 text-sm">
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

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.message ? (
        <p className="text-sm text-brand" role="status">
          {state.message}
        </p>
      ) : null}
    </div>
  )
}

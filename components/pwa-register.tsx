"use client"

import { useEffect, useState } from "react"

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* install can still work from the manifest if registration is blocked */
    })
  }, [])
  return null
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallButton({ compact = false }: { compact?: boolean }) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone))
    if (standalone) setInstalled(true)

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (installed) {
    return (
      <p className="text-sm text-ink-soft" data-testid="pwa-installed">
        Easy Rental is installed on this device.
      </p>
    )
  }
  if (!prompt) {
    if (compact) return null
    return (
      <p className="text-sm text-ink-soft" data-testid="pwa-install-hint">
        PWA ready — use the browser install icon when it appears (this environment may not fire a
        prompt).
      </p>
    )
  }
  return (
    <button
      type="button"
      className="btn btn-primary btn-sm rounded-sm"
      data-testid="pwa-install"
      onClick={() => {
        void prompt.prompt()
      }}
    >
      Install Easy Rental
    </button>
  )
}

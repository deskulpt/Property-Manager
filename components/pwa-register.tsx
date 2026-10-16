"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* demo install still works from the manifest if registration is blocked */
    })
  }, [])
  return null
}

export function InstallButton() {
  const [prompt, setPrompt] = useState<{ prompt: () => Promise<void> } | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as unknown as { prompt: () => Promise<void> })
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
    return <p className="text-sm text-ink-soft">Easy Rental is installed on this device.</p>
  }
  if (!prompt) {
    return (
      <p className="text-sm text-ink-soft">
        The app manifest and service worker are active. Use the browser install icon when it appears — this environment may not fire an install prompt.
      </p>
    )
  }
  return (
    <Button
      type="button"
      onClick={() => {
        void prompt.prompt()
      }}
    >
      Install Easy Rental
    </Button>
  )
}

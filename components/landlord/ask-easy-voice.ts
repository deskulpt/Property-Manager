"use client"

/**
 * Browser SpeechRecognition + speechSynthesis for Ask Easy.
 * No external voice API required. Graceful when mic denied / unsupported.
 * Later: Whisper / cloud STT can replace recognition behind the same callbacks.
 */

export type VoiceSupport = {
  recognition: boolean
  synthesis: boolean
}

export function getVoiceSupport(): VoiceSupport {
  if (typeof window === "undefined") {
    return { recognition: false, synthesis: false }
  }
  const SR =
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
      .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  return {
    recognition: Boolean(SR),
    synthesis: typeof window.speechSynthesis !== "undefined",
  }
}

type RecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

function createRecognition(): RecognitionLike | null {
  if (typeof window === "undefined") return null
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => RecognitionLike }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => RecognitionLike })
      .webkitSpeechRecognition
  if (!Ctor) return null
  return new Ctor()
}

export type VoiceSession = {
  start: () => void
  stop: () => void
  speaking: boolean
}

/** Start one-shot voice capture. Calls onFinal with transcript; onStatus for UI. */
export function startVoiceCapture(handlers: {
  onFinal: (transcript: string) => void
  onInterim?: (transcript: string) => void
  onStatus: (status: "listening" | "idle" | "unsupported" | "denied" | "error", detail?: string) => void
}): () => void {
  const rec = createRecognition()
  if (!rec) {
    handlers.onStatus("unsupported", "Speech recognition not available in this browser.")
    return () => {}
  }
  rec.continuous = false
  rec.interimResults = true
  rec.lang = "en-IN"
  rec.onresult = (event) => {
    let interim = ""
    let finalText = ""
    for (let i = 0; i < event.results.length; i++) {
      const row = event.results[i]
      if (row.isFinal) finalText += row[0].transcript
      else interim += row[0].transcript
    }
    if (interim) handlers.onInterim?.(interim)
    if (finalText.trim()) handlers.onFinal(finalText.trim())
  }
  rec.onerror = (event) => {
    const err = event.error ?? "error"
    if (err === "not-allowed" || err === "service-not-allowed") {
      handlers.onStatus("denied", "Microphone permission denied — type instead.")
    } else if (err === "aborted" || err === "no-speech") {
      handlers.onStatus("idle")
    } else {
      handlers.onStatus("error", err)
    }
  }
  rec.onend = () => handlers.onStatus("idle")
  try {
    handlers.onStatus("listening")
    rec.start()
  } catch {
    handlers.onStatus("error", "Could not start microphone.")
  }
  return () => {
    try {
      rec.abort()
    } catch {
      /* ignore */
    }
    handlers.onStatus("idle")
  }
}

export function speakText(text: string): (() => void) | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text.slice(0, 600))
  utter.lang = "en-IN"
  utter.rate = 1
  window.speechSynthesis.speak(utter)
  return () => window.speechSynthesis.cancel()
}

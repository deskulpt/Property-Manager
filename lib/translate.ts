import "server-only"
import fs from "node:fs"
import path from "node:path"
import { englishCatalog, hasTranslationKey, translationApiKey } from "@/lib/i18n"

const LOCALES_DIR = path.join(process.cwd(), "locales")

/**
 * Official Google Cloud Translation API (v2) only.
 * Requires GOOGLE_CLOUD_TRANSLATION_API_KEY or GOOGLE_TRANSLATE_API_KEY.
 * Never scrapes Google. Never invents translated copy.
 */
export async function translateEnglishCatalog(targetCode: string): Promise<
  | { ok: true; messages: Record<string, string> }
  | { ok: false; waiting: true; reason: string }
  | { ok: false; waiting: false; reason: string }
> {
  const key = translationApiKey()
  if (!key) {
    return {
      ok: false,
      waiting: true,
      reason: "Translation waiting on API key. Set GOOGLE_CLOUD_TRANSLATION_API_KEY.",
    }
  }
  const source = englishCatalog()
  const keys = Object.keys(source)
  const values = keys.map((k) => source[k])
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: values,
        source: "en",
        target: targetCode.split("-")[0],
        format: "text",
      }),
    })
    if (!response.ok) {
      const body = await response.text()
      return {
        ok: false,
        waiting: false,
        reason: `Google Cloud Translation API error (${response.status}): ${body.slice(0, 200)}`,
      }
    }
    const data = (await response.json()) as {
      data?: { translations?: { translatedText: string }[] }
    }
    const translations = data.data?.translations
    if (!translations || translations.length !== keys.length) {
      return { ok: false, waiting: false, reason: "Unexpected Translation API response shape." }
    }
    const messages: Record<string, string> = {}
    keys.forEach((k, i) => {
      messages[k] = translations[i].translatedText
    })
    return { ok: true, messages }
  } catch (error) {
    return {
      ok: false,
      waiting: false,
      reason: error instanceof Error ? error.message : "Translation request failed.",
    }
  }
}

export function writeLocaleFile(code: string, messages: Record<string, string>) {
  fs.mkdirSync(LOCALES_DIR, { recursive: true })
  const filePath = path.join(LOCALES_DIR, `${code}.json`)
  fs.writeFileSync(filePath, `${JSON.stringify(messages, null, 2)}\n`, "utf8")
  return filePath
}

export function localeFileExists(code: string) {
  return fs.existsSync(path.join(LOCALES_DIR, `${code}.json`))
}

export function translationConfigured() {
  return hasTranslationKey()
}

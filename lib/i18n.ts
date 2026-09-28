import en from "@/locales/en.json"

export type MessageKey = keyof typeof en

const catalogs: Record<string, Record<string, string>> = {
  en: en as Record<string, string>,
}

export function englishCatalog() {
  return { ...en } as Record<string, string>
}

export function englishKeys() {
  return Object.keys(en) as MessageKey[]
}

export function registerCatalog(code: string, messages: Record<string, string>) {
  catalogs[code] = messages
}

export function getCatalog(code: string) {
  return catalogs[code] ?? null
}

export function t(key: MessageKey | string, locale = "en") {
  const catalog = catalogs[locale] ?? catalogs.en
  return catalog[key] ?? catalogs.en[key] ?? key
}

export function hasTranslationKey() {
  return Boolean(
    process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY?.trim() ||
      process.env.GOOGLE_TRANSLATE_API_KEY?.trim(),
  )
}

export function translationApiKey() {
  return (
    process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY?.trim() ||
    process.env.GOOGLE_TRANSLATE_API_KEY?.trim() ||
    null
  )
}

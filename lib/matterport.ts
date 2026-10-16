/**
 * Matterport show-URL allowlist. DeSkulpt stores an iframe src only —
 * never hosts Matterport assets or the Showcase SDK.
 *
 * Accepted form: https://my.matterport.com/show/?m=<modelId>
 * (optional trailing query params after the model id are allowed)
 */

const SHOW_HOST = "my.matterport.com"
const MODEL_ID = /^[A-Za-z0-9]{6,20}$/

export function isMatterportShowUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return false
    if (url.hostname !== SHOW_HOST) return false
    if (url.pathname !== "/show/" && url.pathname !== "/show") return false
    const model = url.searchParams.get("m")
    if (!model || !MODEL_ID.test(model)) return false
    return true
  } catch {
    return false
  }
}

/** Normalise to a clean embed src, or null if rejected. */
export function matterportEmbedSrc(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!isMatterportShowUrl(trimmed)) return null
  const url = new URL(trimmed)
  const model = url.searchParams.get("m")
  return `https://my.matterport.com/show/?m=${model}`
}

/**
 * Matterport show-URL allowlist. Easy Rental stores an iframe src only —
 * never hosts Matterport assets or the Showcase SDK.
 *
 * Canonical store form: https://my.matterport.com/show/?m=<modelId>
 * Discover `/space/<id>` is accepted on input and normalised to show.
 */

const SHOW_HOST = "my.matterport.com"
const DISCOVER_HOST = "discover.matterport.com"
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

function modelIdFromDiscover(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return null
    if (url.hostname !== DISCOVER_HOST) return null
    const match = url.pathname.match(/^\/space\/([A-Za-z0-9]{6,20})\/?$/)
    if (!match || !MODEL_ID.test(match[1])) return null
    return match[1]
  } catch {
    return null
  }
}

/** Normalise Discover or show input to a clean embed src, or null if rejected. */
export function matterportEmbedSrc(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const fromDiscover = modelIdFromDiscover(trimmed)
  if (fromDiscover) return `https://my.matterport.com/show/?m=${fromDiscover}`

  if (!isMatterportShowUrl(trimmed)) return null
  const url = new URL(trimmed)
  const model = url.searchParams.get("m")
  return `https://my.matterport.com/show/?m=${model}`
}

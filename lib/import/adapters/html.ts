/** Lightweight public-HTML helpers — no browser, no login, no CAPTCHA bypass. */

export function metaContent(html: string, propertyOrName: string): string | null {
  const escaped = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
      "i",
    ),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return decodeEntities(m[1].trim())
  }
  return null
}

export function titleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m?.[1] ? decodeEntities(m[1].trim()) : null
}

export function jsonLdBlocks(html: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) {
    try {
      const parsed = JSON.parse(match[1]!) as unknown
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") blocks.push(item as Record<string, unknown>)
        }
      } else if (parsed && typeof parsed === "object") {
        blocks.push(parsed as Record<string, unknown>)
      }
    } catch {
      /* ignore bad JSON-LD */
    }
  }
  return blocks
}

export function textBetween(html: string, start: RegExp, end: RegExp): string | null {
  const s = html.search(start)
  if (s < 0) return null
  const rest = html.slice(s)
  const e = rest.search(end)
  const chunk = e < 0 ? rest.slice(0, 800) : rest.slice(0, e)
  return stripTags(chunk).trim() || null
}

export function dataAttr(html: string, attr: string): string | null {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const m = html.match(new RegExp(`${escaped}=["']([^"']+)["']`, "i"))
  return m?.[1] ? decodeEntities(m[1].trim()) : null
}

export function stripTags(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )
}

export function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
}

export function parseNumber(raw: string | null | undefined): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^\d.]/g, "")
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export function parseMoneyMajor(raw: string | null | undefined): number | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  let mult = 1
  if (/\blakh\b|\blac\b/.test(lower)) mult = 100_000
  else if (/\bcr\b|\bcrore\b/.test(lower)) mult = 10_000_000
  const n = parseNumber(raw)
  return n == null ? null : n * mult
}

export function firstMatch(html: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return decodeEntities(m[1].trim())
  }
  return null
}

export function collectAmenities(html: string, known: string[]): string[] {
  const lower = html.toLowerCase()
  return known.filter((a) => lower.includes(a.toLowerCase()))
}

/**
 * Ask Easy floating-island open/minimized preference (client localStorage).
 * Pure helpers so unit tests can inject a Storage-like map.
 */

export const ASK_EASY_ISLAND_STORAGE_KEY = "easy-rental.ask-easy.island"

export type AskEasyIslandMode = "open" | "minimized"

export type IslandStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

export function parseAskEasyIslandMode(raw: string | null | undefined): AskEasyIslandMode {
  return raw === "open" ? "open" : "minimized"
}

export function readAskEasyIslandMode(
  storage: IslandStorage | null | undefined,
  fallback: AskEasyIslandMode = "minimized",
): AskEasyIslandMode {
  if (!storage) return fallback
  try {
    return parseAskEasyIslandMode(storage.getItem(ASK_EASY_ISLAND_STORAGE_KEY))
  } catch {
    return fallback
  }
}

export function writeAskEasyIslandMode(
  storage: IslandStorage | null | undefined,
  mode: AskEasyIslandMode,
): void {
  if (!storage) return
  try {
    storage.setItem(ASK_EASY_ISLAND_STORAGE_KEY, mode)
  } catch {
    /* private mode / quota — ignore */
  }
}

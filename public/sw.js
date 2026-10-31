const CACHE = "easyrental-shell-v2"
const PRECACHE = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/logo.svg",
  "/logo.png",
  "/manifest.webmanifest",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => undefined)),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== "GET") return
  if (url.origin !== self.location.origin) return

  const cacheable =
    url.pathname.startsWith("/media/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/floorplans/") ||
    url.pathname.startsWith("/models/") ||
    url.pathname === "/logo.svg" ||
    url.pathname === "/logo.png" ||
    url.pathname === "/logo-white.svg" ||
    url.pathname.endsWith(".webmanifest")

  if (!cacheable) return

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(event.request)
      if (hit) return hit
      try {
        const response = await fetch(event.request)
        if (response.ok) cache.put(event.request, response.clone())
        return response
      } catch {
        return hit || Response.error()
      }
    }),
  )
})

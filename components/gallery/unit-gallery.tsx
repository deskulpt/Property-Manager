"use client"

import { useEffect, useRef, useState } from "react"
import { EmptyState } from "@/components/product"
import { matterportEmbedSrc } from "@/lib/matterport"
import "pannellum/build/pannellum.css"

type Media = { id: string; kind: "photo" | "gif" | "video" | "pano"; url: string; caption: string }

declare global {
  interface Window {
    pannellum?: {
      viewer: (
        node: HTMLElement,
        config: Record<string, unknown>,
      ) => { destroy: () => void }
    }
  }
}

const TABS = [
  { id: "stills", label: "Stills" },
  { id: "motion", label: "GIF & video" },
  { id: "pano", label: "360 photo" },
  { id: "walk", label: "Walkthrough" },
] as const

type TabId = (typeof TABS)[number]["id"]

export function UnitGallery({
  media,
  matterportUrl,
}: {
  media: Media[]
  matterportUrl: string | null
}) {
  const photos = media.filter((item) => item.kind === "photo")
  const motion = media.filter((item) => item.kind === "gif" || item.kind === "video")
  const pano = media.find((item) => item.kind === "pano")
  const [tab, setTab] = useState<TabId>("stills")
  const [activePhoto, setActivePhoto] = useState(0)
  const mount = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tab !== "pano" || !pano || !mount.current) return
    let viewer: { destroy: () => void } | null = null
    let cancelled = false
    ;(async () => {
      await import("pannellum")
      if (cancelled || !mount.current || !window.pannellum) return
      viewer = window.pannellum.viewer(mount.current, {
        type: "equirectangular",
        panorama: pano.url,
        autoLoad: true,
        showFullscreenCtrl: true,
        compass: false,
      })
    })()
    return () => {
      cancelled = true
      viewer?.destroy()
    }
  }, [tab, pano])

  return (
    <div>
      <div
        role="tablist"
        aria-label="Unit media"
        className="flex flex-wrap gap-1 border-b border-ink/15"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            id={`tab-${item.id}`}
            onClick={() => setTab(item.id)}
            className={`relative px-3 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? "border-b-2 border-brand text-brand"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "stills" ? (
          photos.length === 0 ? (
            <EmptyState
              title="No stills yet"
              body="The landlord has not attached photographs for this bay."
            />
          ) : (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[activePhoto]?.url}
                alt={photos[activePhoto]?.caption ?? ""}
                className="aspect-[16/10] w-full object-cover"
              />
              <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                {photos[activePhoto]?.caption}
              </figcaption>
              <div className="mt-3 flex flex-wrap gap-2">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setActivePhoto(index)}
                    className={`h-16 w-24 overflow-hidden border ${
                      index === activePhoto ? "border-brand" : "border-transparent hover:border-ink/20"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </figure>
          )
        ) : null}

        {tab === "motion" ? (
          motion.length === 0 ? (
            <EmptyState
              title="No motion media"
              body="GIF and video show up here when the landlord adds them."
            />
          ) : (
            <div className="grid gap-6">
              {motion.map((item) =>
                item.kind === "gif" ? (
                  <figure key={item.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.caption} className="w-full" />
                    <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                      {item.caption}
                    </figcaption>
                  </figure>
                ) : (
                  <figure key={item.id}>
                    <video src={item.url} controls className="aspect-video w-full bg-brand" />
                    <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                      {item.caption}
                    </figcaption>
                  </figure>
                ),
              )}
            </div>
          )
        ) : null}

        {tab === "pano" ? (
          pano ? (
            <>
              <div className="h-[420px] w-full">
                <div ref={mount} className="h-full w-full bg-brand-deep" />
              </div>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                {pano.caption}
              </p>
            </>
          ) : (
            <EmptyState
              title="No 360 photo"
              body="An equirectangular panorama opens in the Pannellum viewer when one is attached."
            />
          )
        ) : null}

        {tab === "walk" ? (
          (() => {
            const embedSrc = matterportEmbedSrc(matterportUrl)
            if (!embedSrc) {
              return (
                <EmptyState
                  title="No walkthrough URL"
                  body="Paste a Matterport show URL (https://my.matterport.com/show/?m=…) on the unit when you are ready. The slot stays an iframe."
                />
              )
            }
            return (
              <div>
                <div className="relative min-h-[520px] w-full border border-border bg-paper-2">
                  <iframe
                    title="Matterport walkthrough"
                    src={embedSrc}
                    className="absolute inset-0 h-full w-full pointer-events-auto"
                    allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                    loading="lazy"
                  />
                </div>
                <p className="mt-2 text-sm text-ink-soft">
                  Interactive Matterport showcase (demo seed). Easy Rental stores the iframe URL only —
                  orbit and click inside the tour.
                </p>
                <a
                  href={embedSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-semibold text-terra hover:underline"
                >
                  Open walkthrough in a new tab →
                </a>
              </div>
            )
          })()
        ) : null}
      </div>
    </div>
  )
}

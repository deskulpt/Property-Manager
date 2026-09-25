"use client"

import { useEffect, useRef, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/product"
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
  const [tab, setTab] = useState("stills")
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
    <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
      <TabsList className="h-auto w-full flex-wrap justify-start">
        <TabsTrigger value="stills">Stills</TabsTrigger>
        <TabsTrigger value="motion">GIF & video</TabsTrigger>
        <TabsTrigger value="pano">360 photo</TabsTrigger>
        <TabsTrigger value="walk">Walkthrough</TabsTrigger>
      </TabsList>
      <TabsContent value="stills" className="mt-4">
        {photos.length === 0 ? (
          <EmptyState title="No stills yet" body="The landlord has not attached photographs for this bay." />
        ) : (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[activePhoto]?.url} alt={photos[activePhoto]?.caption ?? ""} className="aspect-[16/10] w-full object-cover" />
            <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              {photos[activePhoto]?.caption}
            </figcaption>
            <div className="mt-3 flex gap-2">
              {photos.map((photo, index) => (
                <button key={photo.id} type="button" onClick={() => setActivePhoto(index)} className={`h-16 w-24 overflow-hidden border ${index === activePhoto ? "border-brand" : "border-transparent"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </figure>
        )}
      </TabsContent>
      <TabsContent value="motion" className="mt-4 grid gap-6">
        {motion.length === 0 ? (
          <EmptyState title="No motion media" body="GIF and video show up here when the landlord adds them." />
        ) : (
          motion.map((item) =>
            item.kind === "gif" ? (
              <figure key={item.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.caption} className="w-full" />
                <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">{item.caption}</figcaption>
              </figure>
            ) : (
              <figure key={item.id}>
                <video src={item.url} controls className="aspect-video w-full bg-brand" />
                <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">{item.caption}</figcaption>
              </figure>
            ),
          )
        )}
      </TabsContent>
      <TabsContent value="pano" className="mt-4">
        {pano ? (
          <>
            <div className="h-[420px] w-full">
              <div ref={mount} className="h-full w-full bg-brand-deep" />
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">{pano.caption}</p>
          </>
        ) : (
          <EmptyState title="No 360 photo" body="An equirectangular panorama opens in the Pannellum viewer when one is attached." />
        )}
      </TabsContent>
      <TabsContent value="walk" className="mt-4">
        {matterportUrl ? (
          <div>
            <iframe
              title="Matterport-compatible walkthrough"
              src={matterportUrl}
              className="h-[480px] w-full border border-border bg-paper-2"
              allow="fullscreen; xr-spatial-tracking"
              allowFullScreen
            />
            <p className="mt-2 text-sm text-ink-soft">
              Embed slot only. DeSkulpt stores an iframe URL and does not ship Matterport’s proprietary SDK.
            </p>
          </div>
        ) : (
          <EmptyState title="No walkthrough URL" body="Paste a Matterport show URL on the unit when you are ready. The slot stays an iframe." />
        )}
      </TabsContent>
    </Tabs>
  )
}

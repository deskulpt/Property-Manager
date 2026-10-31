"use client"

import dynamic from "next/dynamic"
import type { ComponentProps } from "react"

const Viewer = dynamic(
  () => import("@/components/floor/draft-building-viewer").then((m) => m.DraftBuildingViewer),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[min(70vh,520px)] items-center justify-center gap-2 border border-border bg-brand-deep font-mono text-xs uppercase tracking-wider text-paper"
        data-testid="draft-building-loading"
      >
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
        Loading extruded building…
      </div>
    ),
  },
)

export function DraftBuildingDynamic(props: ComponentProps<typeof Viewer>) {
  return <Viewer {...props} />
}

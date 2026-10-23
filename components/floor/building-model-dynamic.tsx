"use client"

import dynamic from "next/dynamic"
import type { ComponentProps } from "react"

const Viewer = dynamic(
  () => import("@/components/floor/building-model-viewer").then((m) => m.BuildingModelViewer),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[420px] items-center justify-center border border-border bg-brand-deep font-mono text-xs uppercase tracking-wider text-paper"
        data-testid="building-model-viewer-loading"
      >
        Loading 3D viewer…
      </div>
    ),
  },
)

export function BuildingModelDynamic(props: ComponentProps<typeof Viewer>) {
  return <Viewer {...props} />
}

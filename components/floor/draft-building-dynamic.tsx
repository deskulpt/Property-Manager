"use client"

import dynamic from "next/dynamic"
import { Component, type ComponentProps, type ErrorInfo, type ReactNode } from "react"

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

class DraftViewerBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null }
  static getDerivedStateFromError(err: Error) {
    return { error: err.message || "3D viewer failed" }
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.warn("DraftBuildingViewer", err, info.componentStack)
  }
  render() {
    if (this.state.error) {
      return (
        <div
          className="border border-dashed border-border bg-card/60 p-6 text-sm text-ink-soft"
          data-testid="draft-building-error"
          role="status"
        >
          Draft 3D preview unavailable in this browser session. Floor ingest and plate edit still
          work — refresh to retry the extrude viewer.
        </div>
      )
    }
    return this.props.children
  }
}

export function DraftBuildingDynamic(props: ComponentProps<typeof Viewer>) {
  return (
    <DraftViewerBoundary>
      <Viewer {...props} />
    </DraftViewerBoundary>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useTransition, type DragEvent } from "react"
import {
  publishFloorMapVersionAction,
  submitFloorIngestAction,
} from "@/lib/actions"

type VersionRow = {
  id: string
  status: "draft" | "published"
  sourceKind: string
  sourceFilename: string
  platePath: string | null
  createdAt: string
  publishedAt: string | null
}

type FloorOpt = { id: string; label: string; levelIndex: number }

export function FloorIngestPanel({
  propertyId,
  tenantId,
  floors,
  versions,
  activeMapVersionId,
}: {
  propertyId: string
  /** Optional — managing agent scoped landlord tenant. */
  tenantId?: string | null
  floors: FloorOpt[]
  versions: VersionRow[]
  activeMapVersionId: string | null
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [dragOver, setDragOver] = useState(false)
  const [floorId, setFloorId] = useState(floors[0]?.id ?? "")
  const [publish, setPublish] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function onFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    const data = new FormData()
    data.set("propertyId", propertyId)
    if (tenantId) data.set("tenantId", tenantId)
    if (floorId) data.set("floorId", floorId)
    if (publish) data.set("publish", "1")
    data.set("floorIngest", file)
    setError(null)
    setHint(null)
    setMessage(null)
    startTransition(async () => {
      const result = await submitFloorIngestAction(data)
      if (!result.ok) {
        setError(result.error ?? "Upload failed.")
        setHint(result.hint ?? null)
        return
      }
      const bits = [
        `Ingested ${result.sourceKind?.toUpperCase() ?? "plan"}`,
        result.versionId ? `version ${result.versionId.slice(0, 12)}…` : null,
        publish ? "published" : "saved as draft",
      ].filter(Boolean)
      setMessage(bits.join(" · "))
      if (result.notes?.length) setHint(result.notes.join(" "))
      if (result.warnings?.length) {
        setHint((prev) => [prev, ...result.warnings!].filter(Boolean).join(" "))
      }
      router.refresh()
    })
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    onFiles(event.dataTransfer.files)
  }

  return (
    <section className="grid gap-3" data-testid="floor-ingest-panel">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">
          Main USP · CAD ingest
        </p>
        <h2 className="mt-1 font-serif text-xl font-semibold text-primary">CAD / PDF floor ingest</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Upload a PDF or DXF. We extract exterior and partition walls, unit outlines, doors,
          stairs, lifts, and openings — not furniture, dims, or titleblocks. Publish to stack the
          plate into the 3D building visualizer.
        </p>
        <div
          className="alert alert-warning mt-2 rounded-sm border border-[#8f6f1f]/40 bg-[#8f6f1f]/10 py-2 text-sm text-ink"
          role="note"
          data-testid="floor-ingest-dwg-guidance"
        >
          <span>
            Native DWG is not ingested here — export <strong>DXF (ASCII)</strong> or a single-page{" "}
            <strong>PDF</strong> from CAD (ODA / AutoCAD / LibreDWG convert path), then upload that
            file.
          </span>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-sm border border-base-300 bg-base-100 p-4">
        {floors.length > 0 ? (
          <label className="form-control grid gap-1 text-sm">
            <span className="label-text">Target floor</span>
            <select
              className="select select-bordered select-sm rounded-sm"
              value={floorId}
              onChange={(e) => setFloorId(e.target.value)}
              data-testid="floor-ingest-floor"
            >
              {floors
                .slice()
                .sort((a, b) => a.levelIndex - b.levelIndex)
                .map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.label}
                  </option>
                ))}
            </select>
          </label>
        ) : null}
        <label className="label cursor-pointer justify-start gap-2 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
            data-testid="floor-ingest-publish"
          />
          <span className="label-text">Publish after ingest</span>
        </label>
      </div>

      <div
        role="button"
        tabIndex={0}
        data-testid="floor-ingest-dropzone"
        data-dragover={dragOver ? "true" : "false"}
        aria-busy={pending}
        className="grid place-items-center border border-dashed border-brand/40 bg-[#0a1624] px-6 py-10 text-center transition-colors data-[dragover=true]:border-cyan-400 data-[dragover=true]:bg-[#13253a]"
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        {pending ? (
          <div className="grid place-items-center gap-3" data-testid="floor-ingest-loading">
            <span className="loading loading-spinner loading-md inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#0e6e8c]/30 border-t-[#0e6e8c]" />
            <p className="font-serif text-lg text-[#e8f4f8]">Extracting walls &amp; units…</p>
            <p className="max-w-md text-sm text-[#9bb4c7]">
              Simplifying CAD noise, building the editable plate, then{" "}
              {publish ? "publishing to the 3D stack" : "saving a draft version"}.
            </p>
          </div>
        ) : (
          <>
            <p className="font-serif text-lg text-[#e8f4f8]">Drop PDF or DXF here</p>
            <p className="mt-2 max-w-md text-sm text-[#9bb4c7]">
              Prefer mall PDF or office DXF. PDF content streams are inflated and path-ops extracted
              when present; otherwise a deterministic plate is proposed for edit.
            </p>
            <button
              type="button"
              className="btn btn-primary mt-4 bg-[#0e6e8c] px-4 py-2 text-sm font-bold text-paper"
              onClick={(e) => {
                e.stopPropagation()
                inputRef.current?.click()
              }}
            >
              Choose file
            </button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.dxf,.dwg,application/pdf,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          data-testid="floor-ingest-input"
          disabled={pending}
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {error ? (
        <div className="alert alert-error border border-red-800/30 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert" data-testid="floor-ingest-error">
          {error}
        </div>
      ) : null}
      {hint ? (
        <div className="alert alert-info border border-brand/20 bg-card px-3 py-2 text-sm text-ink-soft" data-testid="floor-ingest-hint">
          {hint}
        </div>
      ) : null}
      {message ? (
        <div className="alert alert-success border border-[#1f6b4a]/30 bg-[#1f6b4a]/10 px-3 py-2 text-sm font-semibold text-[#1f6b4a]" data-testid="floor-ingest-success">
          {message}
        </div>
      ) : null}

      {versions.length === 0 && !pending && !message ? (
        <div
          className="border border-dashed border-border bg-card/50 px-4 py-6 text-center text-sm text-ink-soft"
          data-testid="floor-ingest-empty"
        >
          No map versions yet. Upload a sample floor plan to create the first editable plate.
        </div>
      ) : null}

      {versions.length > 0 ? (
        <div className="overflow-x-auto" data-testid="floor-ingest-versions">
          <table className="table w-full min-w-[28rem] text-left text-sm">
            <thead className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              <tr>
                <th className="py-2 pr-3">Version</th>
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => {
                const active = activeMapVersionId === version.id
                return (
                  <tr key={version.id} className="border-t border-ink/10">
                    <td className="py-2 pr-3 font-mono text-xs">{version.id.slice(0, 14)}…</td>
                    <td className="py-2 pr-3">
                      {version.sourceKind.toUpperCase()} · {version.sourceFilename}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`badge badge-sm ${version.status === "published" ? "badge-success" : "badge-ghost"}`}>
                        {version.status}
                        {active ? " · active" : ""}
                      </span>
                    </td>
                    <td className="py-2">
                      {version.status !== "published" || !active ? (
                        <button
                          type="button"
                          disabled={pending}
                          className="btn btn-link btn-sm h-auto min-h-0 p-0 text-sm font-semibold text-[#0e6e8c] hover:underline disabled:opacity-50"
                          onClick={() => {
                            startTransition(async () => {
                              const result = await publishFloorMapVersionAction({
                                propertyId,
                                versionId: version.id,
                                tenantId,
                              })
                              if (!result.ok) {
                                setError(result.error ?? "Publish failed.")
                                return
                              }
                              setMessage(`Published ${version.id.slice(0, 12)}…`)
                              router.refresh()
                            })
                          }}
                        >
                          Publish
                        </button>
                      ) : (
                        <span className="text-ink-faint">Live</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

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
      if (result.warnings?.length) setHint((prev) => [prev, ...result.warnings!].filter(Boolean).join(" "))
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
        <h2 className="font-serif text-xl font-semibold">CAD / PDF floor ingest</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Drag a PDF or DXF. We keep exterior and partition walls, unit outlines, doors, stairs,
          lifts, and openings — not furniture, dims, or titleblocks.
        </p>
        <p
          className="mt-2 border border-[#8f6f1f]/40 bg-[#8f6f1f]/10 px-3 py-2 text-sm text-ink"
          data-testid="floor-ingest-dwg-guidance"
        >
          Native DWG is not ingested here — export <strong>DXF (ASCII)</strong> or a single-page{" "}
          <strong>PDF</strong> from CAD, then upload that file.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 bg-card p-4 ring-1 ring-foreground/10">
        {floors.length > 0 ? (
          <label className="grid gap-1 text-sm">
            Target floor
            <select
              className="border border-ink/15 bg-paper px-2 py-1.5 text-sm"
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
            data-testid="floor-ingest-publish"
          />
          Publish after ingest
        </label>
      </div>

      <div
        role="button"
        tabIndex={0}
        data-testid="floor-ingest-dropzone"
        data-dragover={dragOver ? "true" : "false"}
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
        <p className="font-serif text-lg text-[#e8f4f8]">Drop PDF or DXF here</p>
        <p className="mt-2 max-w-md text-sm text-[#9bb4c7]">
          Mall PDF and office DXF preferred. DWG uploads show an export message. Stub proposals work
          without a Gemini key — edit walls and units in Plan creator after ingest.
        </p>
        <button
          type="button"
          disabled={pending}
          className="mt-4 bg-[#0e6e8c] px-4 py-2 text-sm font-bold text-paper disabled:opacity-50"
          onClick={(e) => {
            e.stopPropagation()
            inputRef.current?.click()
          }}
        >
          {pending ? "Ingesting…" : "Choose file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.dxf,.dwg,application/pdf,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          data-testid="floor-ingest-input"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {error ? (
        <p className="text-sm text-red-800" role="alert" data-testid="floor-ingest-error">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="text-sm text-ink-soft" data-testid="floor-ingest-hint">
          {hint}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm font-semibold text-[#1f6b4a]" data-testid="floor-ingest-success">
          {message}
        </p>
      ) : null}

      {versions.length > 0 ? (
        <div className="overflow-x-auto" data-testid="floor-ingest-versions">
          <table className="w-full min-w-[28rem] text-left text-sm">
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
                      {version.status}
                      {active ? " · active" : ""}
                    </td>
                    <td className="py-2">
                      {version.status !== "published" || !active ? (
                        <button
                          type="button"
                          disabled={pending}
                          className="text-sm font-semibold text-[#0e6e8c] hover:underline disabled:opacity-50"
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

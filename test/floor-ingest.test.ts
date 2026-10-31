import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { installTempDatabase } from "./helpers/temp-db"
import {
  classifyLayerName,
  extractDxfEntities,
  extractPdfVectors,
  floorMapDocumentSchema,
  parseDxfPairs,
  pdfVectorsToDraft,
  runFloorIngest,
  shouldKeepEntity,
  sniffFloorIngest,
} from "@/lib/floor-ingest"
import { buildExtrudeMeshes } from "@/lib/floor-extrude"
import { seedFromSha256 } from "@/lib/floor-ingest/propose"

installTempDatabase()

const fixtures = path.join(process.cwd(), "test/fixtures/floor-ingest")

async function db() {
  return import("@/lib/db")
}

describe("floor-ingest sniff + simplify", () => {
  it("sniffs PDF, DXF, and DWG samples", () => {
    const pdf = fs.readFileSync(path.join(fixtures, "mall-floor-plan.pdf"))
    const dxf = fs.readFileSync(path.join(fixtures, "office-sample.dxf"))
    const dwg = fs.readFileSync(path.join(fixtures, "office-stub.dwg"))
    expect(sniffFloorIngest(pdf, "mall-floor-plan.pdf")).toBe("pdf")
    expect(sniffFloorIngest(dxf, "office-sample.dxf")).toBe("dxf")
    expect(sniffFloorIngest(dwg, "office-stub.dwg")).toBe("dwg")
  })

  it("keeps walls/units/doors/stairs/lifts and drops furniture/dims/titleblocks", () => {
    expect(classifyLayerName("A-WALL").action).toBe("keep")
    expect(classifyLayerName("UNITS").action).toBe("keep")
    expect(classifyLayerName("DOORS").action).toBe("keep")
    expect(classifyLayerName("STAIRS").action).toBe("keep")
    expect(classifyLayerName("LIFTS").action).toBe("keep")
    expect(classifyLayerName("FURNITURE").action).toBe("drop")
    expect(classifyLayerName("DIMS").action).toBe("drop")
    expect(classifyLayerName("TITLE").action).toBe("drop")
    expect(shouldKeepEntity("FURNITURE", "LINE")).toBe(false)
    expect(shouldKeepEntity("WALLS", "LINE")).toBe(true)
  })
})

describe("floor-ingest pipeline", () => {
  it("extracts PDF content-stream vectors from mall sample", () => {
    const pdf = fs.readFileSync(path.join(fixtures, "mall-floor-plan.pdf"))
    const vectors = extractPdfVectors(pdf, 857, 1192)
    expect(vectors.streamCount).toBeGreaterThan(0)
    expect(vectors.segments.length + vectors.rects.length).toBeGreaterThan(0)
    const seed = seedFromSha256("a".repeat(64))
    const converted = pdfVectorsToDraft(vectors, seed)
    // Mall PDF is drawing-heavy; either real vectors or null (then stub path in ingest).
    if (converted) {
      expect(converted.wallCount + converted.unitCount).toBeGreaterThan(0)
      expect(converted.draft.elements.length).toBeGreaterThan(0)
    }
  })

  it("ingests mall PDF into a versioned map document with unit boxes", () => {
    const pdf = fs.readFileSync(path.join(fixtures, "mall-floor-plan.pdf"))
    const result = runFloorIngest({ bytes: pdf, filename: "mall-floor-plan.pdf" })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.kind).toBe("pdf")
    expect(result.plate?.ext).toBe("svg")
    expect(result.plate?.bytes.byteLength).toBeGreaterThan(100)
    const parsed = floorMapDocumentSchema.safeParse(result.document)
    expect(parsed.success).toBe(true)
    expect(result.document.draft.elements.some((e) => e.kind === "unit")).toBe(true)
    expect(result.document.draft.elements.some((e) => e.kind === "wall")).toBe(true)
    expect(result.document.draft.elements.some((e) => e.kind === "door")).toBe(true)
    expect(result.document.draft.elements.some((e) => e.kind === "lift")).toBe(true)
    expect(result.document.keep).toContain("unit_outlines")
    expect(result.document.drop).toContain("furniture")
    // Notes should mention vectors or deterministic fallback — never silent stub.
    expect(result.document.notes.join(" ").length).toBeGreaterThan(20)
    const meshes = buildExtrudeMeshes([
      {
        id: "f1",
        label: "L1",
        levelIndex: 0,
        draft: result.document.draft,
      },
    ])
    expect(meshes.some((m) => m.kind === "slab")).toBe(true)
    expect(meshes.some((m) => m.kind === "wall" || m.kind === "unit")).toBe(true)
  })

  it("simplifies DXF entities and drops furniture layer geometry", () => {
    const dxf = fs.readFileSync(path.join(fixtures, "office-sample.dxf"))
    const pairs = parseDxfPairs(dxf.toString("utf8"))
    const entities = extractDxfEntities(pairs)
    expect(entities.length).toBeGreaterThan(5)
    expect(entities.some((e) => e.layer === "FURNITURE")).toBe(true)
    const result = runFloorIngest({ bytes: dxf, filename: "office-sample.dxf" })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.kind).toBe("dxf")
    expect(result.document.notes.join(" ")).toMatch(/dropped/i)
    expect(result.document.draft.elements.some((e) => e.kind === "unit")).toBe(true)
    expect(result.document.draft.elements.some((e) => e.kind === "wall")).toBe(true)
  })

  it("rejects native DWG with export DXF/PDF guidance", () => {
    const dwg = fs.readFileSync(path.join(fixtures, "office-stub.dwg"))
    const result = runFloorIngest({ bytes: dwg, filename: "office-12-story-floor-plans.dwg" })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.kind).toBe("dwg")
    expect(result.hint).toMatch(/DXF|PDF/i)
  })
})

describe("floor-ingest persistence", () => {
  it("creates and publishes a map version onto the landlord property", async () => {
    const { propertyForLandlord, createFloorMapVersion, publishFloorMapVersion, listPortfolio } =
      await db()
    const property = listPortfolio().find((p) => p.tenantId === "t_bbm")
    expect(property).toBeTruthy()
    if (!property) return

    const pdf = fs.readFileSync(path.join(fixtures, "mall-floor-plan.pdf"))
    const ingested = runFloorIngest({ bytes: pdf, filename: "mall-floor-plan.pdf" })
    expect(ingested.ok).toBe(true)
    if (!ingested.ok) return

    const created = createFloorMapVersion({
      tenantId: property.tenantId,
      propertyId: property.id,
      floorId: property.floors[0]?.id ?? null,
      sourceKind: ingested.kind,
      sourceFilename: "mall-floor-plan.pdf",
      sourcePath: "/files/demo/floorplans/source.pdf",
      platePath: "/files/demo/floorplans/plate.svg",
      documentJson: JSON.stringify({
        ...ingested.document,
        platePath: "/files/demo/floorplans/plate.svg",
        sourcePath: "/files/demo/floorplans/source.pdf",
      }),
      createdBy: "u_nadia",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const published = publishFloorMapVersion(property.tenantId, property.id, created.versionId)
    expect(published.ok).toBe(true)

    const refreshed = propertyForLandlord(property.tenantId, property.id)
    expect(refreshed?.activeMapVersionId).toBe(created.versionId)
    expect(refreshed?.floorPlanPath).toBe("/files/demo/floorplans/plate.svg")
    expect(refreshed?.mapVersions.some((v) => v.id === created.versionId && v.status === "published")).toBe(
      true,
    )
    const floor = refreshed?.floors.find((f) => f.id === created.floorId)
    expect(floor?.planPath).toBe("/files/demo/floorplans/plate.svg")
    expect(floor?.planDraftJson).toBeTruthy()
  })

  it("isolates map versions by tenant", async () => {
    const { createFloorMapVersion, getFloorMapVersion, listPortfolio } = await db()
    const a = listPortfolio().find((p) => p.tenantId === "t_bbm")
    expect(a).toBeTruthy()
    if (!a) return
    const pdf = fs.readFileSync(path.join(fixtures, "mall-floor-plan.pdf"))
    const ingested = runFloorIngest({ bytes: pdf, filename: "mall-floor-plan.pdf" })
    if (!ingested.ok) return
    const created = createFloorMapVersion({
      tenantId: a.tenantId,
      propertyId: a.id,
      sourceKind: "pdf",
      sourceFilename: "mall-floor-plan.pdf",
      sourcePath: null,
      platePath: null,
      documentJson: JSON.stringify(ingested.document),
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    // Harbourline landlord tenant exists in seed but must not read BBM map versions.
    expect(getFloorMapVersion("t_harbour", created.versionId)).toBeNull()
    expect(getFloorMapVersion(a.tenantId, created.versionId)?.id).toBe(created.versionId)
  })
})

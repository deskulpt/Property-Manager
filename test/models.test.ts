import { beforeEach, describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { installTempDatabase } from "./helpers/temp-db"
import { MODEL_CAPS, rejectReasonForModel, sniffModelKind } from "@/lib/model-sniff"
import { isSafeObjectKey, LocalDiskStore } from "@/lib/object-store"
import { matterportEmbedSrc } from "@/lib/matterport"

installTempDatabase()

async function db() {
  return import("@/lib/db")
}

describe("3D model sniff and caps", () => {
  it("sniffs the seeded commercial GLB", () => {
    const bytes = fs.readFileSync(path.join(process.cwd(), "public/models/seed-commercial.glb"))
    expect(sniffModelKind(bytes)).toBe("glb")
    expect(rejectReasonForModel(bytes, bytes.length)).toBeNull()
  })

  it("rejects oversize GLB", () => {
    const header = Buffer.alloc(16)
    header[0] = 0x67
    header[1] = 0x6c
    header[2] = 0x54
    header[3] = 0x46
    expect(rejectReasonForModel(header, MODEL_CAPS.glb + 1)).toMatch(/25 MB/i)
  })

  it("sniffs IFC STEP header", () => {
    const ifc = Buffer.from("ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC2X3'));\nENDSEC;\n")
    expect(sniffModelKind(ifc)).toBe("ifc")
  })

  it("sniffs OBJ", () => {
    const obj = Buffer.from("# demo\nv 0 0 0\nv 1 0 0\nf 1 2 1\n")
    expect(sniffModelKind(obj)).toBe("obj")
  })
})

describe("ObjectStore LocalDiskStore", () => {
  it("writes versioned tenant keys without original filenames", async () => {
    const store = new LocalDiskStore()
    const put = await store.put({
      tenantId: "t_bbm",
      kind: "models",
      ext: "glb",
      bytes: Buffer.from("glTF"),
      contentType: "model/gltf-binary",
    })
    expect(put.key.startsWith("t_bbm/models/")).toBe(true)
    expect(put.key.endsWith(".glb")).toBe(true)
    expect(put.publicPath).toBe(`/files/${put.key}`)
    expect(isSafeObjectKey(put.key)).toBe(true)
    expect(await store.resolvePath(put.key)).toBeTruthy()
    await store.delete(put.key)
  })

  it("rejects path traversal keys", () => {
    expect(isSafeObjectKey("../etc/passwd")).toBe(false)
    expect(isSafeObjectKey("/abs")).toBe(false)
  })
})

describe("unit ↔ mesh binding", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
  })

  it("seeds waterman GLB path and bay bindings", async () => {
    const { getPropertyBySlug } = await db()
    const property = getPropertyBySlug("waterman")!
    expect(property.modelPath).toBe("/models/seed-commercial.glb")
    expect(property.modelKind).toBe("glb")
    expect(property.meshBindings.length).toBe(4)
    expect(property.meshBindings.map((b) => b.meshKey).sort()).toEqual([
      "A1",
      "A2",
      "B1",
      "B2",
    ])
  })

  it("binds and rejects cross-unit mesh reuse", async () => {
    const { bindUnitMesh, unbindUnitMesh, getPropertyBySlug } = await db()
    // Clear B1 then rebind
    expect(unbindUnitMesh("t_bbm", "p_waterman", "B1").ok).toBe(true)
    const again = bindUnitMesh({
      tenantId: "t_bbm",
      propertyId: "p_waterman",
      unitId: "u_waterman_b1",
      meshKey: "B1",
      meshKind: "gltf_name",
    })
    expect(again.ok).toBe(true)
    const conflict = bindUnitMesh({
      tenantId: "t_bbm",
      propertyId: "p_waterman",
      unitId: "u_waterman_a1",
      meshKey: "B1",
      meshKind: "gltf_name",
    })
    expect(conflict.ok).toBe(false)
    const property = getPropertyBySlug("waterman")!
    expect(property.meshBindings.some((b) => b.meshKey === "B1" && b.unitId === "u_waterman_b1")).toBe(
      true,
    )
  })

  it("rejects cross-floor bind when active floor disagrees", async () => {
    const { bindUnitMesh } = await db()
    const result = bindUnitMesh({
      tenantId: "t_bbm",
      propertyId: "p_powai",
      unitId: "u_powai_p0",
      meshKey: "floor0-bay",
      meshKind: "gltf_name",
      activeFloorId: "f_powai_7",
    })
    expect(result.ok).toBe(false)
  })

  it("Matterport seeds use §4.6 show URLs", async () => {
    const { getPropertyBySlug } = await db()
    const waterman = getPropertyBySlug("waterman")!
    const b1 = waterman.units.find((u) => u.code === "B1")!
    expect(b1.matterportUrl).toBe("https://my.matterport.com/show/?m=PmWtWjyqpJs")
    expect(
      matterportEmbedSrc("https://discover.matterport.com/space/PmWtWjyqpJs"),
    ).toBe("https://my.matterport.com/show/?m=PmWtWjyqpJs")
    expect(matterportEmbedSrc("https://evil.example/show/?m=PmWtWjyqpJs")).toBeNull()
  })

  it("Powai still has 8 floors for scroll fixture", async () => {
    const { getPropertyBySlug } = await db()
    const powai = getPropertyBySlug("powai")!
    expect(powai.floors.length).toBe(8)
  })
})

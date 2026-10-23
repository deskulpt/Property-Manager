/**
 * Builds a tiny multi-bay GLB for demo seed (Kenney-style low-poly shell).
 * Named meshes match waterman unit codes so unit↔mesh bindings work on reset.
 * Full Kenney City Kit Commercial (CC0) + Duplex IFC (CC BY 4.0): see CREDITS.
 *
 * Avoids three/GLTFExporter (needs FileReader). Emits a minimal GLB by hand.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, "..", "public", "models")
fs.mkdirSync(outDir, { recursive: true })

/** Unit cube [-0.5,0.5]^3 as triangles. */
function unitCube() {
  const p = [
    [-0.5, -0.5, 0.5],
    [0.5, -0.5, 0.5],
    [0.5, 0.5, 0.5],
    [-0.5, 0.5, 0.5],
    [-0.5, -0.5, -0.5],
    [0.5, -0.5, -0.5],
    [0.5, 0.5, -0.5],
    [-0.5, 0.5, -0.5],
  ]
  const faces = [
    [0, 1, 2, 0, 2, 3],
    [1, 5, 6, 1, 6, 2],
    [5, 4, 7, 5, 7, 6],
    [4, 0, 3, 4, 3, 7],
    [3, 2, 6, 3, 6, 7],
    [4, 5, 1, 4, 1, 0],
  ]
  const positions = []
  const indices = []
  let vi = 0
  for (const face of faces) {
    for (let i = 0; i < 6; i++) {
      const [x, y, z] = p[face[i]]
      positions.push(x, y, z)
      indices.push(vi++)
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint16Array(indices) }
}

function transformBox(sx, sy, sz, tx, ty, tz) {
  const { positions, indices } = unitCube()
  const out = new Float32Array(positions.length)
  for (let i = 0; i < positions.length; i += 3) {
    out[i] = positions[i] * sx + tx
    out[i + 1] = positions[i + 1] * sy + ty
    out[i + 2] = positions[i + 2] * sz + tz
  }
  return { positions: out, indices }
}

const parts = [
  { name: "slab", ...transformBox(24, 1.2, 16, 0, -0.6, 0), color: [0.54, 0.6, 0.67, 1] },
  { name: "A1", ...transformBox(5.5, 3.2, 5.5, -7, 1.6, -3.5), color: [0.12, 0.42, 0.29, 1] },
  { name: "A2", ...transformBox(5.5, 3.2, 5.5, 0, 1.6, -3.5), color: [0.05, 0.43, 0.55, 1] },
  { name: "B1", ...transformBox(5.5, 3.2, 5.5, -7, 1.6, 3.5), color: [0.56, 0.44, 0.12, 1] },
  { name: "B2", ...transformBox(5.5, 3.2, 5.5, 0, 1.6, 3.5), color: [0.35, 0.42, 0.48, 1] },
  { name: "C1", ...transformBox(5.5, 3.2, 5.5, 7, 1.6, -3.5), color: [0.23, 0.29, 0.35, 1] },
  { name: "C2", ...transformBox(5.5, 3.2, 5.5, 7, 1.6, 3.5), color: [0.16, 0.48, 0.42, 1] },
]

const binChunks = []
let binOffset = 0
const bufferViews = []
const accessors = []
const materials = []
const meshes = []
const nodes = []

function align4(n) {
  return (n + 3) & ~3
}

function pushBuffer(bytes) {
  const start = binOffset
  binChunks.push(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength))
  binOffset += bytes.byteLength
  const pad = align4(binOffset) - binOffset
  if (pad) {
    binChunks.push(Buffer.alloc(pad))
    binOffset += pad
  }
  return { byteOffset: start, byteLength: bytes.byteLength }
}

for (const part of parts) {
  const posView = pushBuffer(part.positions)
  const idxView = pushBuffer(part.indices)
  const posAccessor = accessors.length
  accessors.push({
    bufferView: bufferViews.length,
    componentType: 5126,
    count: part.positions.length / 3,
    type: "VEC3",
    max: [
      Math.max(...part.positions.filter((_, i) => i % 3 === 0)),
      Math.max(...part.positions.filter((_, i) => i % 3 === 1)),
      Math.max(...part.positions.filter((_, i) => i % 3 === 2)),
    ],
    min: [
      Math.min(...part.positions.filter((_, i) => i % 3 === 0)),
      Math.min(...part.positions.filter((_, i) => i % 3 === 1)),
      Math.min(...part.positions.filter((_, i) => i % 3 === 2)),
    ],
  })
  bufferViews.push({ buffer: 0, byteOffset: posView.byteOffset, byteLength: posView.byteLength, target: 34962 })

  const idxAccessor = accessors.length
  accessors.push({
    bufferView: bufferViews.length,
    componentType: 5123,
    count: part.indices.length,
    type: "SCALAR",
  })
  bufferViews.push({ buffer: 0, byteOffset: idxView.byteOffset, byteLength: idxView.byteLength, target: 34963 })

  const matIndex = materials.length
  materials.push({
    name: `${part.name}_mat`,
    pbrMetallicRoughness: {
      baseColorFactor: part.color,
      metallicFactor: 0.05,
      roughnessFactor: 0.8,
    },
  })

  const meshIndex = meshes.length
  meshes.push({
    name: part.name,
    primitives: [
      {
        attributes: { POSITION: posAccessor },
        indices: idxAccessor,
        material: matIndex,
      },
    ],
  })

  nodes.push({ name: part.name, mesh: meshIndex })
}

const rootNode = nodes.length
nodes.push({
  name: "BBM_Bhiwandi_Shell",
  children: parts.map((_, i) => i),
})

const gltf = {
  asset: { version: "2.0", generator: "easy-rental-seed" },
  scene: 0,
  scenes: [{ name: "Scene", nodes: [rootNode] }],
  nodes,
  meshes,
  materials,
  accessors,
  bufferViews,
  buffers: [{ byteLength: binOffset }],
}

const json = Buffer.from(JSON.stringify(gltf))
const jsonPad = align4(json.length) - json.length
const jsonChunk = Buffer.concat([json, Buffer.alloc(jsonPad, 0x20)])
const binChunk = Buffer.concat(binChunks)
const totalLength = 12 + 8 + jsonChunk.length + 8 + binChunk.length

const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0) // glTF
header.writeUInt32LE(2, 4)
header.writeUInt32LE(totalLength, 8)

function chunk(type, data) {
  const h = Buffer.alloc(8)
  h.writeUInt32LE(data.length, 0)
  h.writeUInt32LE(type, 4)
  return Buffer.concat([h, data])
}

const glb = Buffer.concat([
  header,
  chunk(0x4e4f534a, jsonChunk), // JSON
  chunk(0x004e4942, binChunk), // BIN
])

const outPath = path.join(outDir, "seed-commercial.glb")
fs.writeFileSync(outPath, glb)
console.log(`Wrote ${outPath} (${glb.byteLength} bytes)`)

/**
 * Object storage seam for building media and 3D models (PRD Slice B).
 * LocalDiskStore is the OSS / single-node default. S3-compatible adapters
 * land when multi-instance preview needs them — not required for Slice B.
 */
import "server-only"
import { createHash, randomBytes } from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"

export type ObjectPutInput = {
  tenantId: string
  /** Logical namespace, e.g. `models` or `floorplans`. */
  kind: "models" | "floorplans"
  /** File extension without dot (glb, ifc, obj, png, …). */
  ext: string
  bytes: Buffer
  contentType: string
}

export type ObjectPutResult = {
  /** Opaque storage key: `tenant_id/kind/timestamp-rand.ext` */
  key: string
  /** Public URL path served by `/files/...` or `/models/...`. */
  publicPath: string
  bytes: number
  contentType: string
  sha256: string
}

export interface ObjectStore {
  put(input: ObjectPutInput): Promise<ObjectPutResult>
  /** Absolute filesystem path for a stored key, or null if missing. */
  resolvePath(key: string): Promise<string | null>
  delete(key: string): Promise<void>
}

function uploadsRoot() {
  return path.join(process.cwd(), "data", "uploads")
}

function versionedName(ext: string) {
  const stamp = Date.now()
  const rand = randomBytes(4).toString("hex")
  return `${stamp}-${rand}.${ext}`
}

/** Local disk under `data/uploads/{tenantId}/{kind}/`. Keys never use original filenames. */
export class LocalDiskStore implements ObjectStore {
  async put(input: ObjectPutInput): Promise<ObjectPutResult> {
    const safeTenant = input.tenantId.replace(/[^a-zA-Z0-9_-]/g, "_")
    const name = versionedName(input.ext)
    const key = `${safeTenant}/${input.kind}/${name}`
    const abs = path.join(uploadsRoot(), key)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, input.bytes)
    const sha256 = createHash("sha256").update(input.bytes).digest("hex")
    return {
      key,
      publicPath: `/files/${key}`,
      bytes: input.bytes.byteLength,
      contentType: input.contentType,
      sha256,
    }
  }

  async resolvePath(key: string): Promise<string | null> {
    if (!isSafeObjectKey(key)) return null
    const abs = path.join(uploadsRoot(), key)
    try {
      await fs.access(abs)
      return abs
    } catch {
      return null
    }
  }

  async delete(key: string): Promise<void> {
    if (!isSafeObjectKey(key)) return
    const abs = path.join(uploadsRoot(), key)
    try {
      await fs.unlink(abs)
    } catch {
      /* missing is fine */
    }
  }
}

/** Reject path traversal and absolute paths. */
export function isSafeObjectKey(key: string): boolean {
  if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) return false
  const parts = key.split("/")
  if (parts.length < 2 || parts.length > 4) return false
  return parts.every((part) => /^[a-zA-Z0-9._-]+$/.test(part))
}

let singleton: ObjectStore | null = null

export function getObjectStore(): ObjectStore {
  if (!singleton) singleton = new LocalDiskStore()
  return singleton
}

/** Test helper — swap the store (e.g. in-memory) without touching S3. */
export function setObjectStoreForTests(store: ObjectStore | null) {
  singleton = store
}

import path from "node:path"
import { pathToFileURL } from "node:url"

const stub = pathToFileURL(
  path.resolve(import.meta.dirname, "server-only.ts"),
).href

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return {
      shortCircuit: true,
      url: stub,
      format: "module",
    }
  }
  return nextResolve(specifier, context)
}

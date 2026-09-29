/**
 * Resolves TypeScript's module conventions for `node --test`.
 *
 * Two things the app's bundler does and the bare test runner does not:
 *
 * 1. **The `@/` alias.** `tsconfig.json` maps `@/*` to `./src/*`; Node does
 *    not read tsconfig, so a test that imports a module which itself imports
 *    `@/content/...` fails to resolve.
 * 2. **Extensionless specifiers.** TypeScript source says
 *    `from "@/content/card-content"`; Node's ESM resolver requires the
 *    extension, so `.ts` is appended when the bare path does not exist.
 *
 * Only these two rewrites. Anything else is passed straight through, so a
 * genuinely missing module still fails as a missing module.
 */
import { existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = pathToFileURL(resolvePath(import.meta.dirname, "..", "src") + "/").href;

/** `.ts` first, then `/index.ts`, mirroring how the bundler resolves a directory. */
function withExtension(url) {
  if (/\.[cm]?[jt]sx?$/.test(url)) return url;

  for (const candidate of [`${url}.ts`, `${url}.tsx`, `${url}/index.ts`]) {
    if (existsSync(fileURLToPath(candidate))) return candidate;
  }

  return url;
}

export function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    return next(withExtension(SRC + specifier.slice(2)), context);
  }

  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    return next(withExtension(new URL(specifier, context.parentURL).href), context);
  }

  return next(specifier, context);
}

/**
 * Registers the `@/` resolver hook for `node --test`.
 *
 * Passed as `--import`, which runs before the test files load and installs
 * `test-resolve.mjs` as a module-resolution hook. See that file for why the
 * alias needs resolving at all.
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./test-resolve.mjs", pathToFileURL(import.meta.filename));

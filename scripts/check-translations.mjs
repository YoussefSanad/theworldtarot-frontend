/**
 * Which strings are still English, per locale.
 *
 * **The gap the compiler cannot close.** `es/home.json` is typed against
 * `en/home.json`, so a missing or misspelled key is a build error. A *copied*
 * English value is a valid string and always will be, so completeness is not a
 * type question. This walks both trees and reports every value still identical
 * to its English counterpart.
 *
 * `docs/adr/0004-language-is-a-path-segment.md` asks this repository to own its
 * own completeness check, on the grounds that the backend's gate covers Product
 * and Card and will never cover static copy. This is that check.
 *
 * **Reports; does not fail a build.** At handover every string is untranslated
 * and that is the correct state, not an error. Deciding when an incomplete
 * locale should block something belongs to whatever ships the `[locale]` route,
 * and there is no route to block yet.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src/content/locales";
const BASE = "en";
const SHOWN = 40;

/** Every leaf string in a nested value, as `a.b[0].c` paths. */
function leaves(value, path = "") {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, i) => leaves(item, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => leaves(item, path ? `${path}.${key}` : key));
  }
  return [];
}

function load(locale, file) {
  return JSON.parse(readFileSync(join(ROOT, locale, file), "utf8"));
}

const files = readdirSync(join(ROOT, BASE))
  .filter((name) => name.endsWith(".json"))
  .sort();

const locales = readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== BASE)
  .map((entry) => entry.name)
  .sort();

if (locales.length === 0) {
  console.log(`Only ${BASE} exists. Nothing to compare.`);
  process.exit(0);
}

let problems = 0;

for (const locale of locales) {
  let same = 0;
  let total = 0;
  const untranslated = [];

  for (const file of files) {
    const base = new Map(leaves(load(BASE, file)));
    const other = new Map(leaves(load(locale, file)));

    for (const [path, value] of base) {
      total += 1;

      if (!other.has(path)) {
        // The compiler catches this too, but only for a locale some module
        // actually imports. This catches it for every file in the folder.
        console.error(`  MISSING  ${file} ${path}`);
        problems += 1;
        continue;
      }

      if (other.get(path) === value) {
        same += 1;
        untranslated.push([file, path, value]);
      }
    }

    for (const path of other.keys()) {
      if (!base.has(path)) {
        console.error(`  EXTRA    ${file} ${path} — not in ${BASE}`);
        problems += 1;
      }
    }
  }

  const done = total - same;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  console.log(`\n${locale}: ${done} of ${total} translated (${percent}%) — ${same} still identical to ${BASE}`);

  for (const [file, path, value] of untranslated.slice(0, SHOWN)) {
    console.log(`    ${file.padEnd(20)} ${path.padEnd(46)} ${JSON.stringify(value).slice(0, 44)}`);
  }
  if (untranslated.length > SHOWN) console.log(`    … and ${untranslated.length - SHOWN} more`);
}

if (problems > 0) {
  console.error(`\n${problems} key problem(s) above. A missing or extra key is a fault; an untranslated value is not.`);
  process.exit(1);
}

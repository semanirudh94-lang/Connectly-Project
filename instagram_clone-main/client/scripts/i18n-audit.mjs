import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const localesDir = path.join(root, "client", "locales");
const langs = fs
  .readdirSync(localesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

const dictionaries = {};
for (const l of langs) {
  dictionaries[l] = JSON.parse(
    fs.readFileSync(path.join(localesDir, `${l}.json`), "utf8"),
  );
}

const keys = new Set();
const exts = new Set([".ts", ".tsx"]);
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
      continue;
    }
    if (!exts.has(path.extname(entry.name))) continue;
    const src = fs.readFileSync(p, "utf8");
    for (const m of src.matchAll(/\bt\(\s*["'`]([\w.]+)["'`]/g)) {
      keys.add(m[1]);
    }
    // dynamic keys like t(`schedule.status.${status}`)
    for (const m of src.matchAll(/\bt\(\s*[`][^`]*\$\{/g)) {
      keys.add(m[0]);
    }
  }
}
walk(path.join(root, "client"));

const enKeys = new Set(Object.keys(dictionaries.en));
const used = [...keys].filter((k) => !k.startsWith("t(")).sort();

console.log("--- keys used in code but MISSING from en.json ---");
for (const k of used) if (!enKeys.has(k)) console.log(k);

console.log("\n--- keys present in en.json but missing in other langs ---");
for (const l of langs) {
  if (l === "en") continue;
  const set = new Set(Object.keys(dictionaries[l]));
  const missing = [...enKeys].filter((k) => !set.has(k));
  console.log(`${l}: ${missing.length} missing${missing.length ? " -> " + missing.join(", ") : ""}`);
}

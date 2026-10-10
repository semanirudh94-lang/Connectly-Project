import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const en = JSON.parse(
  fs.readFileSync(path.join(root, "client", "locales", "en.json"), "utf8"),
);

const langs = fs
  .readdirSync(path.join(root, "client", "locales"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

const dicts = Object.fromEntries(
  langs.map((l) => [
    l,
    JSON.parse(
      fs.readFileSync(path.join(root, "client", "locales", `${l}.json`), "utf8"),
    ),
  ]),
);

const srcDir = path.join(root, "server", "src");
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".js")) files.push(p);
  }
})(srcDir);

const codes = new Set();
const CODE_RE = /["'](?:code:\s*)?([a-z][a-z0-9_]{3,})["']/g;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  // literal `code: "x"`, fail(res, n, "x", ...), and ternary code assignments
  for (const m of src.matchAll(/code:\s*"([a-z0-9_]+)"/g)) codes.add(m[1]);
  for (const m of src.matchAll(/err\.code\s*=\s*[^\n]*?\?\s*"([a-z0-9_]+)"\s*:\s*"([a-z0-9_]+)"/g)) {
    codes.add(m[1]);
    codes.add(m[2]);
  }
  for (const m of src.matchAll(/fail\(\s*res,\s*\d+,\s*"([a-z0-9_]+)"/g)) codes.add(m[1]);
  for (const m of src.matchAll(/,\s*"(schedule_[a-z_]+|media_required|post_not_found)"/g))
    codes.add(m[1]);
  for (const m of src.matchAll(/"\?(.*)"/g)) void 0;
  for (const m of src.matchAll(/"([a-z0-9_]*limit[a-z_]*)"/g)) codes.add(m[1]);
  for (const m of src.matchAll(/"(plan_[a-z_]+|payments_[a-z_]+|order_not_found)"/g))
    codes.add(m[1]);
}

// Only consider names that look like response codes, not message text.
const suspicious = [...codes]
  .filter((c) => !/^(api|mongodb|objectid|json|utf8|bearer|cookie)$/.test(c))
  .sort();

console.log("codes referenced by the server:", suspicious.length);
const missingIn = (lang) =>
  suspicious.filter((c) => !(key(lang, `errors.${c}`)));
const key = (lang, k) => k in dicts[lang] || k in dicts.en;

for (const l of langs) {
  const missing = suspicious.filter((c) => !(`errors.${c}` in dicts.en || `errors.${c}` in dicts[l]));
  console.log(`${l}: ${missing.length ? missing.join(", ") : "all covered"}`);
}

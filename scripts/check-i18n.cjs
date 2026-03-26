/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const LOCALES_DIR = path.join(ROOT, "src", "locales");
const SRC_DIR = path.join(ROOT, "src");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => n.endsWith(".json")).map((n) => path.join(dir, n));
}

function isObject(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function walkKeys(obj, prefix = "") {
  const out = [];
  if (!isObject(obj)) return out;
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (isObject(v)) out.push(...walkKeys(v, next));
    else out.push(next);
  }
  return out;
}

function readLang(lang) {
  const dir = path.join(LOCALES_DIR, lang);
  const files = listJsonFiles(dir);
  const merged = {};
  for (const f of files) {
    const data = readJson(f);
    Object.assign(merged, data);
  }
  return { dir, files, merged, keys: new Set(walkKeys(merged)) };
}

function walkFiles(dir, exts, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

function scanTKeys(content) {
  const keys = [];
  const re = /\bt\s*\(\s*(['"])([^'"]+)\1/g;
  let m;
  while ((m = re.exec(content))) keys.push(m[2]);
  return keys;
}

function main() {
  const zh = readLang("zh");
  const en = readLang("en");

  const missingInEn = [];
  const missingInZh = [];
  for (const k of zh.keys) if (!en.keys.has(k)) missingInEn.push(k);
  for (const k of en.keys) if (!zh.keys.has(k)) missingInZh.push(k);

  const srcFiles = walkFiles(SRC_DIR, [".ts", ".tsx", ".js", ".jsx"]);
  const usedKeys = new Set();
  for (const f of srcFiles) {
    const content = fs.readFileSync(f, "utf8");
    for (const k of scanTKeys(content)) usedKeys.add(k);
  }

  const missingUsed = [];
  for (const k of usedKeys) {
    if (!zh.keys.has(k) || !en.keys.has(k)) missingUsed.push(k);
  }

  const problems = [];
  if (missingInEn.length) problems.push({ title: "Missing keys in en (present in zh)", items: missingInEn });
  if (missingInZh.length) problems.push({ title: "Missing keys in zh (present in en)", items: missingInZh });
  if (missingUsed.length) problems.push({ title: "Used keys missing in locales", items: missingUsed });

  if (problems.length) {
    for (const p of problems) {
      console.error(`\n[i18n] ${p.title}: ${p.items.length}`);
      for (const k of p.items.slice(0, 200)) console.error(`- ${k}`);
      if (p.items.length > 200) console.error(`... and ${p.items.length - 200} more`);
    }
    process.exit(1);
  }

  console.log(`[i18n] OK. zh keys=${zh.keys.size}, en keys=${en.keys.size}, used t() keys=${usedKeys.size}`);
}

main();


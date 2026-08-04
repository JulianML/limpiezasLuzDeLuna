#!/usr/bin/env node
/**
 * Build: copia solo el contenido público a ./_site/ para que Netlify
 * (o cualquier hosting) lo publique. Excluye lib/, scripts/, netlify/.
 * Las funciones se despliegan desde netlify/functions/ por separado.
 * Tras copiar, ejecuta `scripts/render-posts.js` para pre-renderizar
 * las entradas del blog como HTML estático (requiere TURSO_* en env).
 */

import { cpSync, rmSync, mkdirSync, existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function loadDotenv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf-8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    let [, key, val] = m;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotenv(".env");

const OUT = "_site";
const ROOT = ".";

const SKIP = new Set([
  "_site",
  "node_modules",
  "lib",
  "scripts",
  "netlify",
  ".netlify",
  ".git",
  ".vscode",
  ".idea",
  "package.json",
  "package-lock.json",
  "netlify.toml",
  "README.md",
  "TODO.md",
  ".env",
  ".env.example",
  ".env.local",
  ".env.*.local",
  ".gitignore",
  "*.log",
  "npm-debug.log*",
  ".DS_Store",
]);

function shouldSkip(name) {
  if (SKIP.has(name)) return true;
  for (const pattern of SKIP) {
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
      if (regex.test(name)) return true;
    }
  }
  return false;
}

function copyDir(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    if (shouldSkip(entry)) continue;
    const srcPath = `${src}/${entry}`;
    const destPath = `${dest}/${entry}`;
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      cpSync(srcPath, destPath);
    }
  }
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let files = 0;
for (const entry of readdirSync(ROOT)) {
  if (shouldSkip(entry)) continue;
  const srcPath = `${ROOT}/${entry}`;
  const destPath = `${OUT}/${entry}`;
  const stat = statSync(srcPath);
  if (stat.isDirectory()) {
    copyDir(srcPath, destPath);
    files += readdirSync(srcPath).length;
  } else {
    cpSync(srcPath, destPath);
    files++;
  }
}

console.log(`✓ Build completo: ${files} entradas copiadas a ${OUT}/`);

const render = spawnSync(process.execPath, ["scripts/render-posts.js"], {
  stdio: "inherit",
  env: process.env,
});
if (render.status !== 0) {
  console.error("✗ render-posts falló");
  process.exit(render.status ?? 1);
}

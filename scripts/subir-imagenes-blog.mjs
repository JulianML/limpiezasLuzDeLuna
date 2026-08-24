// Sube las 10 imágenes de assets/img/blog/ a la columna image_data_url de sus
// posts correspondientes (por slug), como data URL base64 — mismo mecanismo que
// ya usa el post de ejemplo y que lee assets/js/blog.js / scripts/render-posts.js.
//
// No toca el post "tecnicas-rappel-benidorm" ni ningún otro campo de texto.
// Solo actualiza image_data_url de los posts listados abajo, y solo si ese post existe.
//
// Uso: node scripts/subir-imagenes-blog.mjs
// Requiere TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en .env

import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const env = readFileSync(".env", "utf-8");
for (const line of env.split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
  if (m) {
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[m[1]] = val;
  }
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// slug del post -> archivo en assets/img/blog/
const IMAGES = {
  "calima-costa-blanca": "calima-costa-blanca.jpg",
  "salitre-cristales": "salitre-cristales.jpg",
  "psicologia-escaparate": "psicologia-escaparate.jpg",
  "agua-pura-osmotizada": "agua-pura-osmotizada.jpg",
  "calendario-limpieza-mediterraneo": "calendario-limpieza-mediterraneo.jpg",
  "checklist-seguridad-cristales-altura": "checklist-seguridad-cristales-altura.jpg",
  "mantenimiento-preventivo-vidrios": "mantenimiento-preventivo-vidrios.jpg",
  "mantenimiento-cortinas-cristal": "mantenimiento-cortinas-cristal.jpg",
  "limpieza-espejos-profesional": "limpieza-espejos-profesional.jpg",
  "caseros-vs-profesionales": "caseros-vs-profesionales.jpg",
};

let ok = 0;
let skipped = 0;

for (const [slug, filename] of Object.entries(IMAGES)) {
  const existing = await client.execute({
    sql: "SELECT slug, title FROM posts WHERE slug = ?",
    args: [slug],
  });

  if (existing.rows.length === 0) {
    console.log(`[SKIP] No existe ningún post con slug "${slug}"`);
    skipped++;
    continue;
  }

  const bytes = readFileSync(`assets/img/blog/${filename}`);
  const dataUrl = `data:image/jpeg;base64,${bytes.toString("base64")}`;

  const res = await client.execute({
    sql: "UPDATE posts SET image_data_url = ? WHERE slug = ?",
    args: [dataUrl, slug],
  });

  console.log(`[OK] ${slug} <- ${filename} (${(bytes.length / 1024).toFixed(0)} KB, ${res.rowsAffected} fila actualizada)`);
  ok++;
}

console.log(`\nListo: ${ok} posts actualizados, ${skipped} omitidos.`);
console.log('Recuerda ejecutar "npm run build" después para regenerar _site/blog/post/ con las imágenes.');

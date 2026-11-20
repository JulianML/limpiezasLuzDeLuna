// Publica la entrada "Calidad de los productos para limpiar cristales" en los
// 5 idiomas (es/en/fr/de/ru), con imagen, miniatura, categoría y tags.
//
// Contenido: scripts/content/calidad-productos-limpieza-cristales/
//   meta.json  -> slug, categoría, tags, títulos, extractos y fechas
//   <locale>.md -> cuerpo en markdown (admite ## / ### / listas / **negrita** / [enlace](/ruta))
//
// Uso (desde la raíz del proyecto):
//   node scripts/publicar-post-calidad-productos.mjs            -> inserta (omite idiomas ya existentes)
//   node scripts/publicar-post-calidad-productos.mjs --update   -> además actualiza título/extracto/cuerpo si ya existe
//   node scripts/publicar-post-calidad-productos.mjs --draft    -> inserta como borrador (published = 0)
// Requiere TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en .env

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";
import { generateThumbnailDataUrl } from "../lib/image.js";

const env = readFileSync(".env", "utf-8");
for (const line of env.split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
  if (m) {
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[m[1]] = val;
  }
}

const UPDATE = process.argv.includes("--update");
const DRAFT = process.argv.includes("--draft");
const DIR = "scripts/content/calidad-productos-limpieza-cristales";
const meta = JSON.parse(readFileSync(`${DIR}/meta.json`, "utf-8"));

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const imageBytes = readFileSync(meta.image);
const imageDataUrl = `data:image/jpeg;base64,${imageBytes.toString("base64")}`;
const thumbnailDataUrl = await generateThumbnailDataUrl(imageDataUrl);
const published = DRAFT ? 0 : meta.published;

async function getTagId(slug, name, locale) {
  const r = await client.execute({ sql: "SELECT id FROM tags WHERE slug = ? AND locale = ? LIMIT 1", args: [slug, locale] });
  if (r.rows.length) return r.rows[0].id;
  const id = `tag-${randomUUID()}`;
  await client.execute({ sql: "INSERT INTO tags (id, slug, name, locale) VALUES (?, ?, ?, ?)", args: [id, slug, name, locale] });
  console.log(`  + tag nuevo "${slug}" (${locale})`);
  return id;
}

for (const [locale, t] of Object.entries(meta.locales)) {
  const body = readFileSync(`${DIR}/${locale}.md`, "utf-8").replace(/\r\n/g, "\n").trim();

  const cat = await client.execute({
    sql: "SELECT id FROM categories WHERE slug = ? AND locale = ? LIMIT 1",
    args: [meta.categorySlug, locale],
  });
  const categoryId = cat.rows.length ? cat.rows[0].id : null;
  if (!categoryId) console.warn(`  ! categoría "${meta.categorySlug}" no encontrada en ${locale}`);

  const existing = await client.execute({
    sql: "SELECT id FROM posts WHERE slug = ? AND locale = ? LIMIT 1",
    args: [meta.slug, locale],
  });

  let postId;
  if (existing.rows.length) {
    postId = existing.rows[0].id;
    if (!UPDATE) { console.log(`[SKIP] ${locale}: ya existe (usa --update para sobrescribir)`); continue; }
    await client.execute({
      sql: `UPDATE posts SET title = ?, excerpt = ?, body = ?, date_label = ?, image_data_url = ?, thumbnail_data_url = ?,
              category_id = ?, published = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [t.title, t.excerpt, body, t.dateLabel, imageDataUrl, thumbnailDataUrl, categoryId, published, postId],
    });
    console.log(`[UPDATE] ${locale}: ${t.title}`);
  } else {
    postId = randomUUID();
    await client.execute({
      sql: `INSERT INTO posts (id, slug, title, excerpt, body, date_label, image_data_url, thumbnail_data_url, published, category_id, locale, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [postId, meta.slug, t.title, t.excerpt, body, t.dateLabel, imageDataUrl, thumbnailDataUrl, published, categoryId, locale],
    });
    console.log(`[OK] ${locale}: ${t.title}`);
  }

  await client.execute({ sql: "DELETE FROM post_tags WHERE post_id = ?", args: [postId] });
  for (const tag of meta.tags) {
    const tagId = await getTagId(tag.slug, tag.i18n[locale] || tag.i18n.es, locale);
    await client.execute({ sql: "INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)", args: [postId, tagId] });
  }
}

console.log(`\nListo. URL: https://limpiezasluzdeluna.es/blog/post/${meta.slug}/`);
console.log("Recuerda subir también los cambios de assets/js/blog.js (soporte de enlaces) para que los links se vean en la web.");

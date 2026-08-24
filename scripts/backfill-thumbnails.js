#!/usr/bin/env node
/**
 * Genera thumbnail_data_url para todos los posts existentes que tengan
 * image_data_url pero no miniatura todavía (columna añadida por
 * ensureSchema() en lib/db.js). Necesario tras introducir las miniaturas:
 * las entradas ya guardadas antes de ese cambio no tienen una.
 *
 * Uso:
 *   node scripts/backfill-thumbnails.js
 *
 * Idempotente: solo procesa filas con thumbnail_data_url vacío/NULL.
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@libsql/client";
import { ensureSchema } from "../lib/db.js";
import { generateThumbnailDataUrl } from "../lib/image.js";

function loadDotenv() {
  const path = ".env";
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, "");
    if (k && !(k in process.env)) process.env[k] = v;
  }
}

loadDotenv();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) { console.error("Falta TURSO_DATABASE_URL"); process.exit(1); }
if (!authToken) { console.error("Falta TURSO_AUTH_TOKEN"); process.exit(1); }

const db = createClient({ url, authToken });

(async () => {
  await ensureSchema();

  const result = await db.execute(
    `SELECT id, slug, locale, image_data_url FROM posts
     WHERE image_data_url IS NOT NULL AND image_data_url != ''
       AND (thumbnail_data_url IS NULL OR thumbnail_data_url = '')`
  );

  console.log(`Encontrados ${result.rows.length} posts con imagen sin miniatura.`);

  let ok = 0;
  let failed = 0;
  for (const row of result.rows) {
    const thumb = await generateThumbnailDataUrl(row.image_data_url);
    if (!thumb) {
      console.warn(`✗ No se pudo generar miniatura para ${row.slug} (${row.locale})`);
      failed++;
      continue;
    }
    await db.execute({
      sql: `UPDATE posts SET thumbnail_data_url = ? WHERE id = ?`,
      args: [thumb, row.id],
    });
    console.log(`✓ ${row.slug} (${row.locale}) — ${row.image_data_url.length} → ${thumb.length} chars`);
    ok++;
  }

  console.log(`\n✓ Listo: ${ok} miniaturas generadas, ${failed} fallidas.`);
})().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

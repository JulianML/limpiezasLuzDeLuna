// Despublica el post "Técnicas de Rappel: cómo trabajamos suspendidos en los rascacielos
// de Benidorm" (slug: tecnicas-rappel-benidorm) porque su contenido (nudos, arneses EN
// 12841, descensos a 80m) contradice el servicio real de la empresa (pértiga/plataformas
// hasta 20m, sin descolgamientos) y usa una cifra de experiencia distinta ("15 años" en
// vez de "+35 años").
//
// No borra el post, solo lo oculta (published = 0), así se puede reeditar o volver a
// publicar más adelante desde el backoffice.
//
// Uso: node scripts/despublicar-post-rappel.mjs
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

const SLUG = "tecnicas-rappel-benidorm";

const before = await client.execute({
  sql: "SELECT slug, title, published FROM posts WHERE slug = ?",
  args: [SLUG],
});

if (before.rows.length === 0) {
  console.log(`No se encontró ningún post con slug "${SLUG}". Nada que hacer.`);
  process.exit(0);
}

console.log("Post encontrado:", before.rows[0].title, "| published actual:", before.rows[0].published);

const res = await client.execute({
  sql: "UPDATE posts SET published = 0 WHERE slug = ?",
  args: [SLUG],
});

console.log("Filas actualizadas:", res.rowsAffected);

const after = await client.execute({
  sql: "SELECT slug, title, published FROM posts WHERE slug = ?",
  args: [SLUG],
});

console.log("Estado final -> published:", after.rows[0].published, "(0 = despublicado, 1 = publicado)");
console.log("Listo. Recuerda ejecutar \"npm run build\" para que _site/ refleje el cambio si sirves el sitio desde ahí.");

#!/usr/bin/env node
/**
 * Inicializa el schema de Turso y, opcionalmente, siembra entradas de ejemplo.
 *
 * Uso (local):
 *   1. Crea el archivo .env en la raíz con TURSO_DATABASE_URL y TURSO_AUTH_TOKEN
 *   2. node scripts/init-db.js            # solo crea el schema
 *   3. node scripts/init-db.js --seed     # además inserta 4 entradas de ejemplo
 *
 * Uso (con Netlify CLI, leyendo las vars del dashboard):
 *   netlify env:exec -- node scripts/init-db.js --seed
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@libsql/client";
import { ensureSchema } from "../lib/db.js";

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

function id() {
  return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const CATEGORIES = [
  { id: "cat-clima",     slug: "clima-costa-blanca", name: "El Clima de la Costa Blanca", description: "Calima, salitre, viento y todo lo que el Mediterráneo le hace a tus cristales.", sortOrder: 1 },
  { id: "cat-negocios",  slug: "negocios-hoteles",   name: "Guía para Negocios y Hoteles", description: "Estrategias y mantenimiento para escaparates, fachadas y cristalería profesional.", sortOrder: 2 },
  { id: "cat-hogar",     slug: "soluciones-hogar",   name: "Soluciones para el Hogar", description: "Guías prácticas para mantener los cristales de casa como el primer día.", sortOrder: 3 },
  { id: "cat-seguridad", slug: "seguridad-tecnica",  name: "Seguridad y Técnica", description: "Cómo trabajamos: técnicas, materiales y seguridad en altura.", sortOrder: 4 },
];

const TAGS = [
  { id: "tag-clima",         slug: "clima",          name: "Clima" },
  { id: "tag-costa-blanca",  slug: "costa-blanca",   name: "Costa Blanca" },
  { id: "tag-calima",        slug: "calima",         name: "Calima" },
  { id: "tag-salitre",       slug: "salitre",        name: "Salitre" },
  { id: "tag-hogar",         slug: "hogar",          name: "Hogar" },
  { id: "tag-negocios",      slug: "negocios",       name: "Negocios" },
  { id: "tag-escaparate",    slug: "escaparate",     name: "Escaparate" },
  { id: "tag-altura",        slug: "altura",         name: "Cristales en altura" },
  { id: "tag-seguridad",     slug: "seguridad",      name: "Seguridad" },
  { id: "tag-agua-osm",      slug: "agua-osmotizada", name: "Agua osmotizada" },
  { id: "tag-rappel",        slug: "rappel",         name: "Rappel" },
  { id: "tag-mantenimiento", slug: "mantenimiento",  name: "Mantenimiento" },
  { id: "tag-vidrio",        slug: "vidrio",         name: "Vidrio" },
  { id: "tag-temporada",     slug: "temporada",      name: "Temporada" },
  { id: "tag-espejos",       slug: "espejos",        name: "Espejos" },
  { id: "tag-productos",     slug: "productos",      name: "Productos" },
];

const SEED = [
  {
    slug: "calima-costa-blanca",
    title: "Guía de supervivencia a la Calima",
    excerpt: "Cómo limpiar el barro del Sahara sin rayar el vidrio de tu ventana.",
    dateLabel: "5 de marzo de 2026",
    published: 1,
    categoryId: "cat-clima",
    tagIds: ["tag-clima", "tag-calima", "tag-costa-blanca", "tag-agua-osm"],
    body: `## ¿Por qué la calima deja los cristales "imposibles"?

El polvo que llega del Sahara tiene una composición mineral abrasiva. Si lo frotas en seco, lo que parece limpiar lo que hace es rallar el cristal.

## Método profesional en 3 pasos

- Rociar agua osmotizada sobre el cristal.
- Dejar actuar 2 minutos para disolver el barro.
- Pasar rasqueta de goma de arriba abajo, sin repasar.

## Lo que nunca debes hacer

- Usar papel de periódico seco.
- Frotar con bayeta de microfibra sucia.
- Aplicar amoniaco directamente sobre el vidrio caliente.`,
  },
  {
    slug: "salitre-cristales",
    title: "Salitre: el enemigo invisible de tus vistas al mar",
    excerpt: "La sal del Mediterráneo cristaliza en los poros del vidrio y lo opaca con el tiempo.",
    dateLabel: "12 de febrero de 2026",
    published: 1,
    categoryId: "cat-clima",
    tagIds: ["tag-clima", "tag-salitre", "tag-costa-blanca", "tag-mantenimiento"],
    body: `## ¿Qué es el salitre?

La sal marina disuelta en el aire se deposita sobre el cristal. Al evaporarse, cristaliza y crea una micro-capa opaca.

## Cómo identificarlo

Si al limpiar el cristal notas una "neblina" que no se va ni con limpiacristales, probablemente es salitre.

## Tratamiento

- Lavar con agua tibia y jabón neutro.
- Aclarar con agua osmotizada para no dejar residuo.
- Aplicar un sellador anti-salitre cada 6 meses.`,
  },
  {
    slug: "psicologia-escaparate",
    title: "Psicología del escaparate: cómo un cristal sucio te hace perder ventas",
    excerpt: "El estado de tu escaparate habla antes que tu mejor vendedor.",
    dateLabel: "20 de enero de 2026",
    published: 1,
    categoryId: "cat-negocios",
    tagIds: ["tag-negocios", "tag-escaparate", "tag-mantenimiento"],
    body: `## La regla de los 3 segundos

Un cliente decide en 3 segundos si entra o sigue caminando. Un cristal sucio grita "abandonado" antes que cualquier otro detalle.

## Lo que dice el cristal

- Rayas: falta de cuidado.
- Huellas: producto poco profesional.
- Polvo en marcos: cierre inminente.

## Frecuencia recomendada

- Comercio a pie de calle: limpieza exterior cada 2-3 días.
- Interior: cada 7-10 días.
- Escaparate completo: cada 15 días.`,
  },
  {
    slug: "agua-pura-osmotizada",
    title: "¿Qué es el agua pura osmotizada? La ciencia detrás de nuestra limpieza",
    excerpt: "Cero residuos, cero marcas. Por qué profesionales de todo el mundo la usan.",
    dateLabel: "10 de enero de 2026",
    published: 1,
    categoryId: "cat-seguridad",
    tagIds: ["tag-agua-osm", "tag-altura", "tag-mantenimiento"],
    body: `## El problema del agua del grifo

Contiene calcio, magnesio y sales. Al secarse sobre el cristal, dejan las típicas marcas blancas.

## ¿Qué la hace "pura"?

Ha pasado por un sistema de osmosis inversa que elimina el 99% de minerales y sales. Queda solo H₂O.

## Beneficios prácticos

- No deja residuos al secarse.
- Disuelve mejor la suciedad grasa.
- Permite limpiar sin productos químicos.`,
  },
];

async function seedTaxonomy() {
  for (const c of CATEGORIES) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO categories (id, slug, name, description, sort_order)
            VALUES (?, ?, ?, ?, ?)`,
      args: [c.id, c.slug, c.name, c.description, c.sortOrder],
    });
  }
  for (const t of TAGS) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO tags (id, slug, name) VALUES (?, ?, ?)`,
      args: [t.id, t.slug, t.name],
    });
  }
  console.log(`✓ Taxonomía: ${CATEGORIES.length} categorías, ${TAGS.length} tags.`);
}

async function seedPosts() {
  let inserted = 0;
  for (const post of SEED) {
    const exists = await db.execute({ sql: `SELECT id FROM posts WHERE slug = ?`, args: [post.slug] });
    if (exists.rows.length) {
      console.log(`↺ Ya existe: ${post.slug}`);
      continue;
    }
    const postId = id();
    await db.execute({
      sql: `INSERT INTO posts (id, slug, title, excerpt, body, date_label, published, category_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [postId, post.slug, post.title, post.excerpt, post.body, post.dateLabel, post.published, post.categoryId],
    });
    for (const tagId of post.tagIds) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)`,
        args: [postId, tagId],
      });
    }
    inserted++;
    console.log(`+ Insertada: ${post.slug}`);
  }
  console.log(`✓ Seed completado: ${inserted} entradas nuevas.`);
}

const wantsSeed = process.argv.includes("--seed");

(async () => {
  try {
    await ensureSchema();
    console.log("✓ Schema listo (categories, tags, post_tags, posts + índices).");
    if (wantsSeed) {
      await seedTaxonomy();
      await seedPosts();
    }
    console.log("✓ Listo.");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();

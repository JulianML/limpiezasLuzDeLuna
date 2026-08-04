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

const DDL = [
  `CREATE TABLE IF NOT EXISTS posts (
     id TEXT PRIMARY KEY,
     slug TEXT UNIQUE NOT NULL,
     title TEXT NOT NULL,
     excerpt TEXT NOT NULL DEFAULT '',
     body TEXT NOT NULL DEFAULT '',
     date_label TEXT NOT NULL,
     image_data_url TEXT,
     published INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON posts(updated_at DESC)`,
];

async function ensureSchema() {
  for (const stmt of DDL) {
    await db.execute(stmt);
  }
  console.log("✓ Schema listo (tabla posts + índices).");
}

function id() {
  return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const SEED = [
  {
    slug: "calima-costa-blanca",
    title: "Guía de supervivencia a la Calima",
    excerpt: "Cómo limpiar el barro del Sahara sin rayar el vidrio de tu ventana.",
    dateLabel: "5 de marzo de 2026",
    published: 1,
    body: `## ¿Por qué la calima deja los cristales “imposibles”?

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
    body: `## ¿Qué es el salitre?

La sal marina disuelta en el aire se deposita sobre el cristal. Al evaporarse, cristaliza y crea una micro-capa opaca.

## Cómo identificarlo

Si al limpiar el cristal notas una “neblina” que no se va ni con limpiacristales, probablemente es salitre.

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
    body: `## La regla de los 3 segundos

Un cliente decide en 3 segundos si entra o sigue caminando. Un cristal sucio grita "abandonado" antes que cualquier otro detalle.

## Lo que dice el cristal

- Rayas: falta de cuidado.
- Huellas: producto poco profesional.
- Polvo en marcos: cierre inminente.

## Frecuencia recomendada

- Comercio a pie de calle: limpieza exterior cada 2–3 días.
- Interior: cada 7–10 días.
- Escaparate completo: cada 15 días.`,
  },
  {
    slug: "agua-pura-osmotizada",
    title: "¿Qué es el agua pura osmotizada? La ciencia detrás de nuestra limpieza",
    excerpt: "Cero residuos, cero marcas. Por qué profesionales de todo el mundo la usan.",
    dateLabel: "10 de enero de 2026",
    published: 1,
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

async function seed() {
  let inserted = 0;
  for (const post of SEED) {
    const exists = await db.execute({ sql: `SELECT id FROM posts WHERE slug = ?`, args: [post.slug] });
    if (exists.rows.length) {
      console.log(`↺ Ya existe: ${post.slug}`);
      continue;
    }
    await db.execute({
      sql: `INSERT INTO posts (id, slug, title, excerpt, body, date_label, published)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id(), post.slug, post.title, post.excerpt, post.body, post.dateLabel, post.published],
    });
    inserted++;
    console.log(`+ Insertada: ${post.slug}`);
  }
  console.log(`✓ Seed completado: ${inserted} entradas nuevas.`);
}

const wantsSeed = process.argv.includes("--seed");

(async () => {
  try {
    await ensureSchema();
    if (wantsSeed) await seed();
    console.log("✓ Listo.");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();

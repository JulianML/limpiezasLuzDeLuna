import { createClient } from "@libsql/client";

let _client = null;

export function getDb() {
  if (_client) return _client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error("TURSO_DATABASE_URL no está definida");
  if (!authToken) throw new Error("TURSO_AUTH_TOKEN no está definida");

  _client = createClient({ url, authToken });
  return _client;
}

export const SUPPORTED_LOCALES = ["es", "en", "fr", "de", "ru"];
export const DEFAULT_LOCALE = "es";

export function normalizeLocale(locale) {
  const s = String(locale || "").trim().toLowerCase();
  return SUPPORTED_LOCALES.includes(s) ? s : DEFAULT_LOCALE;
}

let _initialized = false;

export async function ensureSchema() {
  if (_initialized) return;
  const db = getDb();

  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS post_tags (
         post_id TEXT NOT NULL,
         tag_id  TEXT NOT NULL,
         PRIMARY KEY (post_id, tag_id)
       )`,
      `CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id)`,
      `CREATE INDEX IF NOT EXISTS idx_post_tags_tag  ON post_tags(tag_id)`,
    ],
    "write"
  );

  await ensureCategoriesSchema(db);
  await ensureTagsSchema(db);
  await ensurePostsSchema(db);

  _initialized = true;
}

async function ensureCategoriesSchema(db) {
  const tablesResult = await db.execute(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'categories'`
  );
  const exists = tablesResult.rows.length > 0;

  if (!exists) {
    await db.execute(
      `CREATE TABLE categories (
         id          TEXT PRIMARY KEY,
         slug        TEXT NOT NULL,
         name        TEXT NOT NULL,
         description TEXT NOT NULL DEFAULT '',
         sort_order  INTEGER NOT NULL DEFAULT 0,
         locale      TEXT NOT NULL DEFAULT 'es',
         created_at  TEXT NOT NULL DEFAULT (datetime('now'))
       )`
    );
  } else {
    const cols = await db.execute(`PRAGMA table_info(categories)`);
    const hasLocale = cols.rows.some((r) => r.name === "locale");
    if (!hasLocale) {
      // Migración idempotente: crea la tabla nueva sin el UNIQUE inline sobre
      // slug (pasa a ser compuesto vía índice) y con la columna locale,
      // copia los datos existentes, hace DROP y RENAME.
      await db.batch(
        [
          `CREATE TABLE categories_new (
             id          TEXT PRIMARY KEY,
             slug        TEXT NOT NULL,
             name        TEXT NOT NULL,
             description TEXT NOT NULL DEFAULT '',
             sort_order  INTEGER NOT NULL DEFAULT 0,
             locale      TEXT NOT NULL DEFAULT 'es',
             created_at  TEXT NOT NULL DEFAULT (datetime('now'))
           )`,
          `INSERT INTO categories_new (id, slug, name, description, sort_order, locale, created_at)
           SELECT id, slug, name, description, sort_order, 'es', created_at FROM categories`,
          `DROP TABLE categories`,
          `ALTER TABLE categories_new RENAME TO categories`,
        ],
        "write"
      );
    }
  }

  await db.batch(
    [
      `CREATE INDEX IF NOT EXISTS idx_categories_slug        ON categories(slug)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug_locale ON categories(slug, locale)`,
      `CREATE INDEX IF NOT EXISTS idx_categories_sort        ON categories(sort_order)`,
      `CREATE INDEX IF NOT EXISTS idx_categories_locale      ON categories(locale)`,
    ],
    "write"
  );
}

async function ensureTagsSchema(db) {
  const tablesResult = await db.execute(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tags'`
  );
  const exists = tablesResult.rows.length > 0;

  if (!exists) {
    await db.execute(
      `CREATE TABLE tags (
         id         TEXT PRIMARY KEY,
         slug       TEXT NOT NULL,
         name       TEXT NOT NULL,
         locale     TEXT NOT NULL DEFAULT 'es',
         created_at TEXT NOT NULL DEFAULT (datetime('now'))
       )`
    );
  } else {
    const cols = await db.execute(`PRAGMA table_info(tags)`);
    const hasLocale = cols.rows.some((r) => r.name === "locale");
    if (!hasLocale) {
      await db.batch(
        [
          `CREATE TABLE tags_new (
             id         TEXT PRIMARY KEY,
             slug       TEXT NOT NULL,
             name       TEXT NOT NULL,
             locale     TEXT NOT NULL DEFAULT 'es',
             created_at TEXT NOT NULL DEFAULT (datetime('now'))
           )`,
          `INSERT INTO tags_new (id, slug, name, locale, created_at)
           SELECT id, slug, name, 'es', created_at FROM tags`,
          `DROP TABLE tags`,
          `ALTER TABLE tags_new RENAME TO tags`,
        ],
        "write"
      );
    }
  }

  await db.batch(
    [
      `CREATE INDEX IF NOT EXISTS idx_tags_slug        ON tags(slug)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_slug_locale ON tags(slug, locale)`,
      `CREATE INDEX IF NOT EXISTS idx_tags_locale      ON tags(locale)`,
    ],
    "write"
  );
}

async function ensurePostsSchema(db) {
  const tablesResult = await db.execute(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'posts'`
  );
  const postsExists = tablesResult.rows.length > 0;

  if (!postsExists) {
    await db.execute(
      `CREATE TABLE posts (
         id              TEXT PRIMARY KEY,
         slug            TEXT NOT NULL,
         title           TEXT NOT NULL,
         excerpt         TEXT NOT NULL DEFAULT '',
         body            TEXT NOT NULL DEFAULT '',
         date_label      TEXT NOT NULL,
         image_data_url  TEXT,
         published       INTEGER NOT NULL DEFAULT 0,
         category_id     TEXT,
         locale          TEXT NOT NULL DEFAULT 'es',
         created_at      TEXT NOT NULL DEFAULT (datetime('now')),
         updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
       )`
    );
  } else {
    const cols = await db.execute(`PRAGMA table_info(posts)`);
    const hasCategoryId = cols.rows.some((r) => r.name === "category_id");
    const hasLocale = cols.rows.some((r) => r.name === "locale");
    if (!hasCategoryId || !hasLocale) {
      // Migración idempotente: crea la tabla nueva con las columnas que falten
      // (category_id y/o locale) y sin el UNIQUE inline sobre slug (pasa a ser
      // compuesto slug+locale vía índice), copia los datos existentes,
      // hace DROP y RENAME. Compone bien tanto si solo falta una de las dos
      // columnas como si faltan ambas.
      await db.batch(
        [
          `CREATE TABLE posts_new (
             id              TEXT PRIMARY KEY,
             slug            TEXT NOT NULL,
             title           TEXT NOT NULL,
             excerpt         TEXT NOT NULL DEFAULT '',
             body            TEXT NOT NULL DEFAULT '',
             date_label      TEXT NOT NULL,
             image_data_url  TEXT,
             published       INTEGER NOT NULL DEFAULT 0,
             category_id     TEXT,
             locale          TEXT NOT NULL DEFAULT 'es',
             created_at      TEXT NOT NULL DEFAULT (datetime('now')),
             updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
           )`,
          `INSERT INTO posts_new (id, slug, title, excerpt, body, date_label, image_data_url, published, category_id, locale, created_at, updated_at)
           SELECT id, slug, title, excerpt, body, date_label, image_data_url, published, ${hasCategoryId ? "category_id" : "NULL"}, ${hasLocale ? "locale" : "'es'"}, created_at, updated_at FROM posts`,
          `DROP TABLE posts`,
          `ALTER TABLE posts_new RENAME TO posts`,
        ],
        "write"
      );
    }
  }

  // thumbnail_data_url: versión reducida (ancho ~480px) de image_data_url,
  // generada al guardar el post (ver lib/image.js). Los listados públicos y
  // del backoffice sirven esta miniatura en vez de la imagen completa —
  // devolver la imagen original en el listado hacía que la respuesta de la
  // función superase el límite de payload de Netlify (6 MB) en cuanto había
  // más de un puñado de entradas con foto. Simple ADD COLUMN: no requiere
  // reconstruir la tabla porque no toca ninguna constraint existente.
  const postsCols = await db.execute(`PRAGMA table_info(posts)`);
  if (!postsCols.rows.some((r) => r.name === "thumbnail_data_url")) {
    await db.execute(`ALTER TABLE posts ADD COLUMN thumbnail_data_url TEXT`);
  }

  await db.batch(
    [
      `CREATE INDEX IF NOT EXISTS idx_posts_slug        ON posts(slug)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug_locale ON posts(slug, locale)`,
      `CREATE INDEX IF NOT EXISTS idx_posts_published   ON posts(published)`,
      `CREATE INDEX IF NOT EXISTS idx_posts_updated_at  ON posts(updated_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_posts_category    ON posts(category_id)`,
      `CREATE INDEX IF NOT EXISTS idx_posts_locale      ON posts(locale)`,
    ],
    "write"
  );
}

export function rowToCategory(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || "",
    sortOrder: row.sort_order ?? 0,
    locale: row.locale || DEFAULT_LOCALE,
    createdAt: row.created_at,
  };
}

export function rowToTag(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    locale: row.locale || DEFAULT_LOCALE,
    createdAt: row.created_at,
  };
}

export function rowToPostPublic(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || "",
    body: row.body || "",
    dateLabel: row.date_label,
    imageDataUrl: row.image_data_url || "",
    thumbnailDataUrl: row.thumbnail_data_url || "",
    published: !!row.published,
    categoryId: row.category_id || null,
    locale: row.locale || DEFAULT_LOCALE,
    category: null,
    tags: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPostListItem(row) {
  return rowToPostPublic(row);
}

export async function fetchCategories(locale = DEFAULT_LOCALE) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, slug, name, description, sort_order, locale, created_at
          FROM categories
          WHERE locale = ?
          ORDER BY sort_order ASC, name ASC`,
    args: [normalizeLocale(locale)],
  });
  return result.rows.map(rowToCategory);
}

export async function fetchTags(locale = DEFAULT_LOCALE) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, slug, name, locale, created_at FROM tags WHERE locale = ? ORDER BY name ASC`,
    args: [normalizeLocale(locale)],
  });
  return result.rows.map(rowToTag);
}

// Variante sin filtro de idioma — usada por el backoffice cuando necesita
// ver/editar la taxonomía de todos los idiomas a la vez.
export async function fetchAllCategories() {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, slug, name, description, sort_order, locale, created_at
          FROM categories
          ORDER BY locale ASC, sort_order ASC, name ASC`,
    args: [],
  });
  return result.rows.map(rowToCategory);
}

export async function fetchAllTags() {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, slug, name, locale, created_at FROM tags ORDER BY locale ASC, name ASC`,
    args: [],
  });
  return result.rows.map(rowToTag);
}

export async function fetchTagsForPost(postId) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT t.id, t.slug, t.name, t.locale, t.created_at
          FROM tags t
          INNER JOIN post_tags pt ON pt.tag_id = t.id
          WHERE pt.post_id = ?
          ORDER BY t.name ASC`,
    args: [postId],
  });
  return result.rows.map(rowToTag);
}

export async function fetchCategoryById(id) {
  if (!id) return null;
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, slug, name, description, sort_order, locale, created_at
          FROM categories WHERE id = ? LIMIT 1`,
    args: [id],
  });
  const row = result.rows[0];
  return row ? rowToCategory(row) : null;
}

export async function fetchPostsWithRelations(baseSql, baseArgs = []) {
  const db = getDb();
  const result = await db.execute({ sql: baseSql, args: baseArgs });
  const posts = result.rows.map(rowToPostPublic);
  if (!posts.length) return posts;

  const ids = posts.map((p) => p.id);
  const placeholders = ids.map(() => "?").join(",");

  const tagResult = await db.execute({
    sql: `SELECT pt.post_id, t.id AS tag_id, t.slug AS tag_slug, t.name AS tag_name
          FROM post_tags pt
          INNER JOIN tags t ON t.id = pt.tag_id
          WHERE pt.post_id IN (${placeholders})
          ORDER BY t.name ASC`,
    args: ids,
  });

  const tagsByPost = new Map();
  for (const row of tagResult.rows) {
    const list = tagsByPost.get(row.post_id) || [];
    list.push({ id: row.tag_id, slug: row.tag_slug, name: row.tag_name });
    tagsByPost.set(row.post_id, list);
  }

  for (const post of posts) {
    post.tags = tagsByPost.get(post.id) || [];
  }

  return posts;
}

export function slugifyTagSlug(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

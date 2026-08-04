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

let _initialized = false;

export async function ensureSchema() {
  if (_initialized) return;
  const db = getDb();

  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS categories (
         id          TEXT PRIMARY KEY,
         slug        TEXT UNIQUE NOT NULL,
         name        TEXT NOT NULL,
         description TEXT NOT NULL DEFAULT '',
         sort_order  INTEGER NOT NULL DEFAULT 0,
         created_at  TEXT NOT NULL DEFAULT (datetime('now'))
       )`,
      `CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)`,
      `CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order)`,

      `CREATE TABLE IF NOT EXISTS tags (
         id         TEXT PRIMARY KEY,
         slug       TEXT UNIQUE NOT NULL,
         name       TEXT NOT NULL,
         created_at TEXT NOT NULL DEFAULT (datetime('now'))
       )`,
      `CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug)`,

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

  await ensurePostsSchema(db);

  _initialized = true;
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
         slug            TEXT UNIQUE NOT NULL,
         title           TEXT NOT NULL,
         excerpt         TEXT NOT NULL DEFAULT '',
         body            TEXT NOT NULL DEFAULT '',
         date_label      TEXT NOT NULL,
         image_data_url  TEXT,
         published       INTEGER NOT NULL DEFAULT 0,
         category_id     TEXT,
         created_at      TEXT NOT NULL DEFAULT (datetime('now')),
         updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
       )`
    );
  } else {
    const cols = await db.execute(`PRAGMA table_info(posts)`);
    const hasCategoryId = cols.rows.some((r) => r.name === "category_id");
    if (!hasCategoryId) {
      // Migración idempotente: crea la tabla nueva con la columna extra,
      // copia los datos existentes, hace DROP y RENAME.
      await db.batch(
        [
          `CREATE TABLE posts_new (
             id              TEXT PRIMARY KEY,
             slug            TEXT UNIQUE NOT NULL,
             title           TEXT NOT NULL,
             excerpt         TEXT NOT NULL DEFAULT '',
             body            TEXT NOT NULL DEFAULT '',
             date_label      TEXT NOT NULL,
             image_data_url  TEXT,
             published       INTEGER NOT NULL DEFAULT 0,
             category_id     TEXT,
             created_at      TEXT NOT NULL DEFAULT (datetime('now')),
             updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
           )`,
          `INSERT INTO posts_new (id, slug, title, excerpt, body, date_label, image_data_url, published, category_id, created_at, updated_at)
           SELECT id, slug, title, excerpt, body, date_label, image_data_url, published, NULL, created_at, updated_at FROM posts`,
          `DROP TABLE posts`,
          `ALTER TABLE posts_new RENAME TO posts`,
        ],
        "write"
      );
    }
  }

  await db.batch(
    [
      `CREATE INDEX IF NOT EXISTS idx_posts_slug       ON posts(slug)`,
      `CREATE INDEX IF NOT EXISTS idx_posts_published  ON posts(published)`,
      `CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON posts(updated_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_posts_category   ON posts(category_id)`,
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
    createdAt: row.created_at,
  };
}

export function rowToTag(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
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
    published: !!row.published,
    categoryId: row.category_id || null,
    category: null,
    tags: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPostListItem(row) {
  return rowToPostPublic(row);
}

export async function fetchCategories() {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, slug, name, description, sort_order, created_at
          FROM categories
          ORDER BY sort_order ASC, name ASC`,
    args: [],
  });
  return result.rows.map(rowToCategory);
}

export async function fetchTags() {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, slug, name, created_at FROM tags ORDER BY name ASC`,
    args: [],
  });
  return result.rows.map(rowToTag);
}

export async function fetchTagsForPost(postId) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT t.id, t.slug, t.name, t.created_at
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
    sql: `SELECT id, slug, name, description, sort_order, created_at
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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

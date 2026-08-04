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
    ],
    "write"
  );
  _initialized = true;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPostListItem(row) {
  return rowToPostPublic(row);
}

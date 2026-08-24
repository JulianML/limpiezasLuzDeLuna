import { randomUUID } from "node:crypto";
import {
  ensureSchema,
  getDb,
  rowToPostPublic,
  fetchCategoryById,
  fetchTagsForPost,
  slugifyTagSlug,
  normalizeLocale,
} from "../../lib/db.js";
import { isAuthenticated, json, methodNotAllowed } from "../../lib/auth.js";

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function pickString(v, max = 5000) {
  if (typeof v !== "string") return "";
  return v.slice(0, max);
}

function parseTagsPayload(v) {
  if (Array.isArray(v)) {
    return v.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean);
  }
  if (typeof v === "string") {
    return v.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

async function upsertTagsByNames(db, names, locale) {
  const tags = [];
  for (const raw of names) {
    const name = String(raw).trim().slice(0, 60);
    if (!name) continue;
    const slug = slugifyTagSlug(name);
    if (!slug) continue;
    const existing = await db.execute({
      sql: `SELECT id, slug, name FROM tags WHERE slug = ? AND locale = ? LIMIT 1`,
      args: [slug, locale],
    });
    if (existing.rows.length) {
      tags.push(existing.rows[0]);
    } else {
      const id = `tag-${randomUUID()}`;
      await db.execute({
        sql: `INSERT INTO tags (id, slug, name, locale) VALUES (?, ?, ?, ?)`,
        args: [id, slug, name, locale],
      });
      tags.push({ id, slug, name });
    }
  }
  // dedupe
  const seen = new Set();
  return tags.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
}

async function attachTags(db, postId, tagIds) {
  await db.execute({ sql: `DELETE FROM post_tags WHERE post_id = ?`, args: [postId] });
  for (const tagId of tagIds) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)`,
      args: [postId, tagId],
    });
  }
}

async function loadPostForApi(db, postId) {
  const result = await db.execute({ sql: `SELECT * FROM posts WHERE id = ? LIMIT 1`, args: [postId] });
  const row = result.rows[0];
  if (!row) return null;
  const post = rowToPostPublic(row);
  post.category = await fetchCategoryById(row.category_id);
  post.tags = await fetchTagsForPost(postId);
  return post;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed(["POST"]);
  }
  if (!(await isAuthenticated(event))) {
    return json(401, { error: "No autenticado" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "JSON inválido" });
  }

  const title = pickString(body.title, 200).trim();
  if (!title) return json(400, { error: "El título es obligatorio" });

  let slug = pickString(body.slug, 80).trim();
  if (!slug) slug = slugify(title);
  if (!slug) return json(400, { error: "El slug no es válido" });
  slug = slugify(slug);

  const excerpt = pickString(body.excerpt, 500);
  const bodyMd = pickString(body.body, 100000);
  const dateLabel = pickString(body.dateLabel, 60).trim();
  const imageDataUrl = pickString(body.imageDataUrl, 4000000);
  const published = body.published ? 1 : 0;
  const categoryId = pickString(body.categoryId, 60).trim() || null;
  const locale = normalizeLocale(body.locale);

  const id = randomUUID();

  try {
    await ensureSchema();
    const db = getDb();

    const exists = await db.execute({
      sql: `SELECT id FROM posts WHERE slug = ? AND locale = ? LIMIT 1`,
      args: [slug, locale],
    });
    if (exists.rows.length) return json(409, { error: "Ya existe una entrada con ese slug para ese idioma" });

    if (categoryId) {
      const cat = await db.execute({
        sql: `SELECT id FROM categories WHERE id = ? LIMIT 1`,
        args: [categoryId],
      });
      if (!cat.rows.length) return json(400, { error: "La categoría no existe" });
    }

    await db.execute({
      sql: `INSERT INTO posts (id, slug, title, excerpt, body, date_label, image_data_url, published, category_id, locale)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, slug, title, excerpt, bodyMd, dateLabel, imageDataUrl, published, categoryId, locale],
    });

    const tagNames = parseTagsPayload(body.tags);
    if (tagNames.length) {
      const tags = await upsertTagsByNames(db, tagNames, locale);
      await attachTags(db, id, tags.map((t) => t.id));
    }

    const post = await loadPostForApi(db, id);
    return json(201, { post });
  } catch (err) {
    console.error("posts-create error:", err);
    return json(500, { error: "No se pudo crear la entrada" });
  }
}

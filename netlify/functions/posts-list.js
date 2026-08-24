import {
  ensureSchema,
  getDb,
  fetchCategories,
  fetchTags,
  fetchAllCategories,
  fetchAllTags,
  SUPPORTED_LOCALES,
} from "../../lib/db.js";
import { isAuthenticated, json, methodNotAllowed } from "../../lib/auth.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }
  if (!(await isAuthenticated(event))) {
    return json(401, { error: "No autenticado" });
  }

  const params = event.queryStringParameters || {};
  const rawLocale = (params.locale || "").toString().trim().toLowerCase();
  // A diferencia de las funciones públicas, aquí "sin locale" significa
  // "todos los idiomas", no "es" — el backoffice necesita ver/editar
  // entradas de cualquier idioma a la vez.
  const locale = SUPPORTED_LOCALES.includes(rawLocale) ? rawLocale : null;

  try {
    await ensureSchema();
    const db = getDb();

    const where = [];
    const args = [];
    if (locale) {
      where.push("locale = ?");
      args.push(locale);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await db.execute({
      sql: `SELECT id, slug, title, excerpt, body, date_label, image_data_url, published, category_id, locale, created_at, updated_at
            FROM posts
            ${whereSql}
            ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC`,
      args,
    });

    const posts = result.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt || "",
      body: row.body || "",
      dateLabel: row.date_label,
      imageDataUrl: row.image_data_url || "",
      published: !!row.published,
      categoryId: row.category_id || null,
      locale: row.locale,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    if (posts.length) {
      const ids = posts.map((p) => p.id);
      const placeholders = ids.map(() => "?").join(",");
      const catResult = await db.execute({
        sql: `SELECT id, slug, name FROM categories`,
        args: [],
      });
      const tagResult = await db.execute({
        sql: `SELECT pt.post_id, t.id AS tag_id, t.slug AS tag_slug, t.name AS tag_name
              FROM post_tags pt
              INNER JOIN tags t ON t.id = pt.tag_id
              WHERE pt.post_id IN (${placeholders})
              ORDER BY t.name ASC`,
        args: ids,
      });

      const catMap = new Map(catResult.rows.map((r) => [r.id, { id: r.id, slug: r.slug, name: r.name }]));
      const tagsByPost = new Map();
      for (const row of tagResult.rows) {
        const list = tagsByPost.get(row.post_id) || [];
        list.push({ id: row.tag_id, slug: row.tag_slug, name: row.tag_name });
        tagsByPost.set(row.post_id, list);
      }
      for (const post of posts) {
        post.category = post.categoryId ? (catMap.get(post.categoryId) || null) : null;
        post.tags = tagsByPost.get(post.id) || [];
      }
    }

    const [categories, tags] = locale
      ? await Promise.all([fetchCategories(locale), fetchTags(locale)])
      : await Promise.all([fetchAllCategories(), fetchAllTags()]);

    return json(200, { posts, categories, tags });
  } catch (err) {
    console.error("posts-list error:", err);
    return json(500, { error: "No se pudieron cargar las entradas" });
  }
}

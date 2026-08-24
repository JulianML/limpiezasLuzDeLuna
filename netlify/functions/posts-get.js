import {
  ensureSchema,
  getDb,
  rowToPostPublic,
  fetchCategoryById,
  fetchTagsForPost,
  normalizeLocale,
} from "../../lib/db.js";
import { json, methodNotAllowed } from "../../lib/auth.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  const params = event.queryStringParameters || {};
  const slug = (params.slug || "").toString().trim();
  const locale = normalizeLocale(params.locale);
  if (!slug) {
    return json(400, { error: "Falta el slug" });
  }

  try {
    await ensureSchema();
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT * FROM posts WHERE slug = ? AND published = 1 AND locale = ? LIMIT 1`,
      args: [slug, locale],
    });
    const row = result.rows[0];
    if (!row) return json(404, { error: "Entrada no encontrada" });

    const post = rowToPostPublic(row);
    post.category = await fetchCategoryById(row.category_id);
    post.tags = await fetchTagsForPost(row.id);

    return json(200, { post });
  } catch (err) {
    console.error("posts-get error:", err);
    return json(500, { error: "No se pudo cargar la entrada" });
  }
}

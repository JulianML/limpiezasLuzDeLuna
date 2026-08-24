import { ensureSchema, getDb, fetchCategories, normalizeLocale } from "../../lib/db.js";
import { json, methodNotAllowed } from "../../lib/auth.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  const params = event.queryStringParameters || {};
  const locale = normalizeLocale(params.locale);
  const categorySlug = (params.category || "").toString().trim();
  const tagSlug = (params.tag || "").toString().trim();
  const search = (params.q || "").toString().trim();

  try {
    await ensureSchema();
    const db = getDb();

    const where = ["p.published = 1", "p.locale = ?"];
    const args = [locale];

    if (categorySlug) {
      where.push("c.slug = ?");
      args.push(categorySlug);
    }
    if (tagSlug) {
      where.push(`p.id IN (
        SELECT pt.post_id FROM post_tags pt
        INNER JOIN tags t ON t.id = pt.tag_id
        WHERE t.slug = ? AND t.locale = ?
      )`);
      args.push(tagSlug, locale);
    }
    if (search) {
      where.push("(p.title LIKE ? OR p.excerpt LIKE ?)");
      args.push(`%${search}%`, `%${search}%`);
    }

    // Nota: NO seleccionamos p.image_data_url aquí a propósito. Las imágenes
    // van en base64 y algunas pesan >1 MB; con varias decenas de entradas
    // (multiplicadas x5 al haber traducciones) la respuesta supera el límite
    // de 6 MB de las Netlify Functions (AWS Lambda) y la función devuelve
    // 502 "ResponseSizeTooLarge". El listado usa el placeholder genérico
    // (blog.js ya cae a PLACEHOLDER_IMG si imageDataUrl viene vacío); la
    // imagen real de cada entrada se sirve solo en posts-get.js, donde una
    // única imagen nunca se acerca al límite.
    const sql = `
      SELECT p.id, p.slug, p.title, p.excerpt, p.date_label,
             p.published, p.category_id, p.locale, p.created_at, p.updated_at,
             c.slug AS category_slug, c.name AS category_name
      FROM posts p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${where.join(" AND ")}
      ORDER BY datetime(p.updated_at) DESC, datetime(p.created_at) DESC
    `;

    const result = await db.execute({ sql, args });
    const posts = result.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt || "",
      dateLabel: row.date_label,
      imageDataUrl: "",
      published: !!row.published,
      categoryId: row.category_id || null,
      locale: row.locale,
      category: row.category_slug
        ? { id: row.category_id, slug: row.category_slug, name: row.category_name }
        : null,
      tags: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    if (posts.length) {
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
    }

    const categories = await fetchCategories(locale);

    return json(200, { posts, categories });
  } catch (err) {
    console.error("posts-public error:", err);
    return json(500, { error: "No se pudieron cargar las entradas" });
  }
}

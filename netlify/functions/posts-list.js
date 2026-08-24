import {
  ensureSchema,
  getDb,
  fetchCategories,
  fetchTags,
  fetchAllCategories,
  fetchAllTags,
  fetchCategoryById,
  fetchTagsForPost,
  rowToPostPublic,
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
  const postId = (params.id || "").toString().trim();

  try {
    await ensureSchema();
    const db = getDb();

    // Detalle de una única entrada (usado por el editor): aquí sí devolvemos
    // body e image_data_url completos — una sola entrada nunca se acerca al
    // límite de payload de las Netlify Functions.
    if (postId) {
      const result = await db.execute({ sql: `SELECT * FROM posts WHERE id = ? LIMIT 1`, args: [postId] });
      const row = result.rows[0];
      if (!row) return json(404, { error: "Entrada no encontrada" });
      const post = rowToPostPublic(row);
      post.category = await fetchCategoryById(row.category_id);
      post.tags = await fetchTagsForPost(row.id);
      return json(200, { post });
    }

    const rawLocale = (params.locale || "").toString().trim().toLowerCase();
    // A diferencia de las funciones públicas, aquí "sin locale" significa
    // "todos los idiomas", no "es" — el backoffice necesita ver/editar
    // entradas de cualquier idioma a la vez.
    const locale = SUPPORTED_LOCALES.includes(rawLocale) ? rawLocale : null;

    const where = [];
    const args = [];
    if (locale) {
      where.push("locale = ?");
      args.push(locale);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Nota: NO seleccionamos body ni image_data_url en el listado a propósito.
    // Con las 5 traducciones por entrada, decenas de posts con cuerpo completo
    // + imágenes en base64 (>1 MB cada una) superarían con facilidad el
    // límite de 6 MB de las Netlify Functions. El editor pide el detalle
    // completo por separado vía ?id=... (rama de arriba) cuando hace falta;
    // para la miniatura de cada fila usamos thumbnail_data_url (ligera).
    const result = await db.execute({
      sql: `SELECT id, slug, title, excerpt, date_label, thumbnail_data_url, published, category_id, locale, created_at, updated_at
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
      dateLabel: row.date_label,
      imageDataUrl: row.thumbnail_data_url || "",
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

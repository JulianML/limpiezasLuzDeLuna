import { ensureSchema, getDb, rowToPostPublic } from "../../lib/db.js";
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

export async function handler(event) {
  if (event.httpMethod !== "PUT") {
    return methodNotAllowed(["PUT"]);
  }
  if (!(await isAuthenticated(event))) {
    return json(401, { error: "No autenticado" });
  }

  const params = event.queryStringParameters || {};
  const id = (params.id || "").toString().trim();
  if (!id) return json(400, { error: "Falta el id" });

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
  slug = slugify(slug);
  if (!slug) return json(400, { error: "El slug no es válido" });

  const excerpt = pickString(body.excerpt, 500);
  const bodyMd = pickString(body.body, 100000);
  const dateLabel = pickString(body.dateLabel, 60).trim();
  const imageDataUrl = pickString(body.imageDataUrl, 4000000);
  const published = body.published ? 1 : 0;

  try {
    await ensureSchema();
    const db = getDb();

    const current = await db.execute({ sql: `SELECT id FROM posts WHERE id = ? LIMIT 1`, args: [id] });
    if (!current.rows.length) return json(404, { error: "Entrada no encontrada" });

    const dup = await db.execute({
      sql: `SELECT id FROM posts WHERE slug = ? AND id != ? LIMIT 1`,
      args: [slug, id],
    });
    if (dup.rows.length) return json(409, { error: "Ya existe otra entrada con ese slug" });

    await db.execute({
      sql: `UPDATE posts
            SET slug = ?, title = ?, excerpt = ?, body = ?, date_label = ?, image_data_url = ?, published = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [slug, title, excerpt, bodyMd, dateLabel, imageDataUrl, published, id],
    });

    const result = await db.execute({ sql: `SELECT * FROM posts WHERE id = ?`, args: [id] });
    return json(200, { post: rowToPostPublic(result.rows[0]) });
  } catch (err) {
    console.error("posts-update error:", err);
    return json(500, { error: "No se pudo actualizar la entrada" });
  }
}

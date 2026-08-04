import { randomUUID } from "node:crypto";
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

  const id = randomUUID();

  try {
    await ensureSchema();
    const db = getDb();
    const exists = await db.execute({ sql: `SELECT id FROM posts WHERE slug = ? LIMIT 1`, args: [slug] });
    if (exists.rows.length) return json(409, { error: "Ya existe una entrada con ese slug" });

    await db.execute({
      sql: `INSERT INTO posts (id, slug, title, excerpt, body, date_label, image_data_url, published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, slug, title, excerpt, bodyMd, dateLabel, imageDataUrl, published],
    });

    const result = await db.execute({ sql: `SELECT * FROM posts WHERE id = ?`, args: [id] });
    return json(201, { post: rowToPostPublic(result.rows[0]) });
  } catch (err) {
    console.error("posts-create error:", err);
    return json(500, { error: "No se pudo crear la entrada" });
  }
}

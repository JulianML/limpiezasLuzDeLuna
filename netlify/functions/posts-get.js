import { ensureSchema, getDb, rowToPostPublic } from "../../lib/db.js";
import { json, methodNotAllowed } from "../../lib/auth.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  const params = event.queryStringParameters || {};
  const slug = (params.slug || "").toString().trim();
  if (!slug) {
    return json(400, { error: "Falta el slug" });
  }

  try {
    await ensureSchema();
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT * FROM posts WHERE slug = ? AND published = 1 LIMIT 1`,
      args: [slug],
    });
    const row = result.rows[0];
    if (!row) return json(404, { error: "Entrada no encontrada" });
    return json(200, { post: rowToPostPublic(row) });
  } catch (err) {
    console.error("posts-get error:", err);
    return json(500, { error: "No se pudo cargar la entrada" });
  }
}

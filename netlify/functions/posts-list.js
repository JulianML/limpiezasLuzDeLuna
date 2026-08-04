import { ensureSchema, getDb, rowToPostListItem } from "../../lib/db.js";
import { isAuthenticated, json, methodNotAllowed } from "../../lib/auth.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }
  if (!(await isAuthenticated(event))) {
    return json(401, { error: "No autenticado" });
  }

  try {
    await ensureSchema();
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT id, slug, title, excerpt, date_label, image_data_url, published, created_at, updated_at
            FROM posts
            ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC`,
      args: [],
    });
    return json(200, { posts: result.rows.map(rowToPostListItem) });
  } catch (err) {
    console.error("posts-list error:", err);
    return json(500, { error: "No se pudieron cargar las entradas" });
  }
}

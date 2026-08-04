import { ensureSchema, getDb, rowToPostListItem } from "../../lib/db.js";
import { json, methodNotAllowed } from "../../lib/auth.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  try {
    await ensureSchema();
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT id, slug, title, excerpt, date_label, image_data_url, published, created_at, updated_at
            FROM posts
            WHERE published = 1
            ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC`,
      args: [],
    });
    const posts = result.rows.map(rowToPostListItem);
    return json(200, { posts });
  } catch (err) {
    console.error("posts-public error:", err);
    return json(500, { error: "No se pudieron cargar las entradas" });
  }
}

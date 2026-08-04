import { ensureSchema, getDb } from "../../lib/db.js";
import { isAuthenticated, json, methodNotAllowed } from "../../lib/auth.js";

export async function handler(event) {
  if (event.httpMethod !== "DELETE") {
    return methodNotAllowed(["DELETE"]);
  }
  if (!(await isAuthenticated(event))) {
    return json(401, { error: "No autenticado" });
  }

  const params = event.queryStringParameters || {};
  const id = (params.id || "").toString().trim();
  if (!id) return json(400, { error: "Falta el id" });

  try {
    await ensureSchema();
    const db = getDb();
    const result = await db.execute({ sql: `DELETE FROM posts WHERE id = ?`, args: [id] });
    if (!result.rowsAffected) return json(404, { error: "Entrada no encontrada" });
    return json(200, { ok: true });
  } catch (err) {
    console.error("posts-delete error:", err);
    return json(500, { error: "No se pudo eliminar la entrada" });
  }
}
